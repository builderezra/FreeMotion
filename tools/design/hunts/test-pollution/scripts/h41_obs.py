import sys,json,time,urllib.request,websocket
port=int(sys.argv[1]); out=sys.argv[2]; limit=int(sys.argv[3])
log=open(out,'a'); t0=time.time(); ws=None
while time.time()-t0<60 and ws is None:
    try:
        tabs=json.load(urllib.request.urlopen('http://127.0.0.1:%d/json'%port,timeout=2)); pg=[t for t in tabs if t['type']=='page'][0]
        ws=websocket.create_connection(pg['webSocketDebuggerUrl'],timeout=30,suppress_origin=True)
    except Exception: time.sleep(.5)
if ws is None: sys.exit()
ws.send(json.dumps({'id':1,'method':'Runtime.enable'})); ws.send(json.dumps({'id':2,'method':'Page.enable'}))
while time.time()-t0<limit:
    try: r=json.loads(ws.recv())
    except Exception as e:
        if 'closed' in str(e).lower(): break
        continue
    m=r.get('method')
    if m=='Runtime.consoleAPICalled':
        a=' '.join(str(x.get('value',x.get('description',''))) for x in r['params']['args'])
        if a.startswith('H41C '): log.write(a[5:]+'\n'); log.flush()
    elif m=='Page.javascriptDialogOpening': log.write('DIALOG '+json.dumps(r['params'])[:300]+'\n'); log.flush()
