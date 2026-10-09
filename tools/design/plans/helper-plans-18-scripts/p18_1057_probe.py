import sys,time,json,subprocess
sys.path.insert(0,'/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad')
import d4shot as S
PROC=None
def rss_mb():
    rows=[l.split(None,3) for l in subprocess.run(['ps','-eo','pid,ppid,rss,args'],capture_output=True,text=True).stdout.splitlines()[1:]]
    kids={}
    for r in rows: kids.setdefault(int(r[1]),[]).append(r)
    stack=[PROC.pid]; tot=0
    while stack:
        pid=stack.pop()
        for r in kids.get(pid,[]):
            stack.append(int(r[0]))
            if '--type=renderer' in r[3]: tot+=int(r[2])
    return tot//1024
JS_MAKE="""(async function(){
  const c=document.createElement('canvas');c.width=4000;c.height=3000;const x=c.getContext('2d');
  const g=x.createImageData(4000,3000);for(let i=0;i<g.data.length;i+=4){g.data[i]=(i*7)&255;g.data[i+1]=(i>>3)&255;g.data[i+2]=(i*13)&255;g.data[i+3]=255;} x.putImageData(g,0,0);
  const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',0.8)); window.__f=new File([blob],'big.jpg',{type:'image/jpeg'}); window.__recs=[];
  c.width=c.height=1; return blob.size;})()"""
JS_LOAD="""(async function(n){ for(let i=0;i<n;i++){ const r=await FM.loadImageFile(window.__f); const c=document.createElement('canvas');c.width=270;c.height=480; c.getContext('2d').drawImage(r.el,0,0,270,480); window.__recs.push(r);} return window.__recs.length;})"""
p,call=S.session(9955)
PROC=p
try:
    call('Page.enable'); call('Runtime.enable')
    call('Emulation.setDeviceMetricsOverride',{'width':800,'height':600,'deviceScaleFactor':1,'mobile':False})
    call('Page.navigate',{'url':'http://localhost:8905/index.html?fmtest=1'}); time.sleep(4)
    print('jpeg bytes', S.ev(call,JS_MAKE)); time.sleep(1)
    base=rss_mb(); print('renderer RSS before', base,'MB')
    done=0
    for n in (1,4,5,10):
        S.ev(call,JS_LOAD+"(%d)"%n); done+=n; time.sleep(1.5)
        print('after',done,'decoded 12 MP stills:',rss_mb(),'MB (+%d)'%(rss_mb()-base))
    S.ev(call,"window.__recs.forEach(r=>{try{URL.revokeObjectURL(r.url)}catch(e){}});window.__recs.length=0;1"); time.sleep(2)
    print('after release', rss_mb(),'MB')
finally: p.kill()
