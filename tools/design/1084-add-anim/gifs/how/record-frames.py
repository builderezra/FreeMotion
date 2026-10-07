import sys,json,time,base64,os
sys.path.insert(0,'/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad')
import d4shot as S
ROOT='/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad/wt-d4/tools/design/1084-add-anim/'
OUT='/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad/d5/frames/'
STEP=30   # ms between frames = the GIF's delay: real speed
OPEN=range(0,450,STEP); HOLD=20; CLOSE=range(0,360,STEP); REST=14; LEAD=3
def run(name,page,qs):
    p,call=S.session(9996)
    try:
        call('Page.enable'); call('Emulation.setDeviceMetricsOverride',{'width':420,'height':900,'deviceScaleFactor':1,'mobile':False})
        call('Page.navigate',{'url':'file://'+ROOT+page+'.html'+qs}); time.sleep(1.5)
        box=S.ev(call,"(function(){var r=document.querySelector('.phone').getBoundingClientRect();return [r.left,r.top]})()")
        tap=S.ev(call,"(function(){var ph=document.querySelector('.phone').getBoundingClientRect();var a=document.querySelector('.addrow');if(!a)return [190,600];var r=a.getBoundingClientRect();return [Math.round(r.left+r.width/2-ph.left),Math.round(r.top+r.height/2-ph.top)]})()")
        print(name,'phone at',box,'tap',tap)
        fr=[]
        def snap(tag):
            time.sleep(.07)
            r=call('Page.captureScreenshot',{'format':'png','clip':{'x':box[0],'y':box[1],'width':380,'height':760,'scale':1}})
            fn=OUT+'%s_%03d.png'%(name,len(fr)); open(fn,'wb').write(base64.b64decode(r['result']['data'])); fr.append(fn)
        x,y=tap
        S.ev(call,"__proto.hardClose();1")
        for _ in range(LEAD): snap('lead')
        for t in OPEN:
            S.ev(call,"__proto.hardClose();__proto.open(%d,%d);__proto.seek(%d);1"%(x,y,t)); snap('open')
        S.ev(call,"__proto.hardClose();__proto.open(%d,%d);__proto.seek(3000);1"%(x,y))
        for _ in range(HOLD): snap('hold')
        S.ev(call,"__proto.close();1")   # ONE continuous close from the held state: re-opening for every frame raced the previous close's own done() timer
        for t in CLOSE:
            S.ev(call,"__proto.seek(%d);1"%t); snap('close')
        S.ev(call,"__proto.hardClose();1")
        for _ in range(REST): snap('rest')
        return fr
    finally: p.kill()
if __name__=='__main__':
    jobs=[('a260','a-circle-reveal','?state=layers&dur=260'),('a340','a-circle-reveal','?state=layers&dur=340'),('b','b-row-expands','?state=layers'),('c','c-slide-up','?state=layers')]
    res={}
    for n,pg,qs in jobs: res[n]=run(n,pg,qs)
    json.dump(res,open('/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad/d5/frames.json','w'))
