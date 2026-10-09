import sys,time,json
sys.path.insert(0,'/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad')
import d4shot as S
port=int(sys.argv[1]); JS=sys.argv[2]
p,call=S.session(9990+port%10)
try:
    call('Page.enable'); call('Runtime.enable')
    call('Emulation.setDeviceMetricsOverride',{'width':380,"height":760,'deviceScaleFactor':3,'mobile':False})
    call('Page.navigate',{'url':'http://localhost:%d/index.html?fmtest=1'%port}); time.sleep(4)
    print(S.ev(call,JS))
finally: p.kill()
