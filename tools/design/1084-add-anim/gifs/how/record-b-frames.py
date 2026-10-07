import sys,json,time,base64,os
sys.path.insert(0,'/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad')
import d4shot as S
ROOT='/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad/wt-d4/tools/design/1084-add-anim/'
OUT='/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad/d4b/frames/'
LEAD,HOLD,REST=90,600,420
def plan(D,step):
    tot=LEAD+D+HOLD+D+REST; out=[]; k=0
    while k*step<tot-1e-6:
        g=k*step
        if g<LEAD: out.append(('closed',0))
        elif g<LEAD+D: out.append(('open',g-LEAD))
        elif g<LEAD+D+HOLD: out.append(('hold',0))
        elif g<LEAD+D+HOLD+D: out.append(('close',g-(LEAD+D+HOLD)))
        else: out.append(('closed',0))
        k+=1
    return out
def record(tag,D,step,page='b-row-expands'):
    p,call=S.session(9996)
    try:
        call('Page.enable'); call('Emulation.setDeviceMetricsOverride',{'width':420,'height':900,'deviceScaleFactor':1,'mobile':False})
        call('Page.navigate',{'url':'file://'+ROOT+page+'.html?state=layers&dur=%d'%D}); time.sleep(1.5)
        box=S.ev(call,"(function(){var r=document.querySelector('.phone').getBoundingClientRect();return [r.left,r.top]})()")
        S.ev(call,"__proto.hardClose();1")
        files=[]
        for i,(ph,t) in enumerate(plan(D,step)):
            W=""
            if ph=='closed': S.ev(call,"__proto.hardClose();1")
            elif ph=='hold': S.ev(call,"__proto.frame('open',%d);1"%(D+5))
            else: S.ev(call,"__proto.frame('%s',%f);1"%(ph,t))
            prev=None
            for _try in range(8):   # a frame counts only when two screenshots in a row are byte-identical (a headless screenshot can show the previous frame)
                time.sleep(.03)
                r=call('Page.captureScreenshot',{'format':'png','clip':{'x':box[0],'y':box[1],'width':380,'height':760,'scale':1}})
                cur=r['result']['data']
                if cur==prev: break
                prev=cur
            fn=OUT+'%s_%04d.png'%(tag,i); open(fn,'wb').write(base64.b64decode(cur)); files.append(fn)
        return files
    finally: p.kill()
if __name__=='__main__':
    res={}
    sel=sys.argv[1:] or ['all']
    for D in (300,380):
        res['gif%d'%D]=record('gif%d'%D,D,30)
        if 'gifonly' in sel: continue
        res['v60_%d'%D]=record('v60_%d'%D,D,1000/60.0)
        res['slow%d'%D]=record('slow%d'%D,D,1000/240.0)
        print(D,{k:len(v) for k,v in res.items()},flush=True)
    json.dump(res,open('/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad/d4b/frames.json','w'))
