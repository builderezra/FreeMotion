import json, os, sys, tempfile, shutil, time, base64
WT = '<a checkout of main, served by tools/serve.sh>'
sys.path.insert(0, WT + '/tests'); sys.dont_write_bytecode = True
import _cdp
js_file, outmp4, port = sys.argv[1], sys.argv[2], int(sys.argv[3])
profile = tempfile.mkdtemp(prefix='fm-ax-'); dport = _cdp.free_port()
proc = _cdp.launch(dport, 1280, 800, profile); cdp = None
try:
    cdp = _cdp.CDP(_cdp.ws_url(dport))
    cdp.send('Emulation.setDeviceMetricsOverride', width=1280, height=800, deviceScaleFactor=1, mobile=False)
    cdp.send('Page.enable')
    cdp.send('Page.addScriptToEvaluateOnNewDocument', source="try { localStorage.setItem('fm.test.seedProject', '1'); } catch (e) {}")
    cdp.send('Page.navigate', url='http://localhost:%d/index.html' % port)
    dl = time.time() + 30
    while time.time() < dl:
        try:
            if cdp.eval("!!(window.FM && FM.scene && document.readyState === 'complete')"): break
        except Exception: pass
        time.sleep(0.25)
    time.sleep(1.5)
    cdp.eval("(function(){ try { if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close(); } catch (e) {} })()"); time.sleep(0.6)
    info = cdp.eval('(async () => { %s\n })()' % open(js_file).read(), await_promise=True)
    print(json.dumps(info)[:3500])
    b = cdp.eval("window.__blob || ''")
    if b:
        open(outmp4, 'wb').write(base64.b64decode(b)); print('wrote', outmp4, os.path.getsize(outmp4))
finally:
    if cdp: cdp.close()
    proc.terminate()
    try: proc.wait(timeout=5)
    except Exception: proc.kill()
    shutil.rmtree(profile, ignore_errors=True)
