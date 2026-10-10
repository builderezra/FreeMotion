import sys,time,json
sys.path.insert(0,'/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad')
import d4shot as S
port=int(sys.argv[1])
JS="""(function(){
  const bad=[], kinds={};
  FM.fxRegistry.allIncludingHidden().forEach(e=>{ if(!e) return; (e.params||[]).forEach(p=>{
    const k=p.type||(p.options?'seg':(p.toggle?'toggle':(p.min!=null||p.max!=null||p.step!=null?'num':'other'))); kinds[k]=(kinds[k]||0)+1;
    if(k==='range'){ const ok=isFinite(p.min)&&isFinite(p.max)&&isFinite(p.step)&&p.step>0&&p.min<=p.max;
      if(!ok) bad.push([e.type,p.key,'range',p.min,p.max,p.step]);
      else{ const d=p.default; if(typeof d==='number' && (d<p.min-1e-9||d>p.max+1e-9)) bad.push([e.type,p.key,'default',d,p.min,p.max]);
        if(p.legacy!=null && (p.legacy<p.min-1e-9||p.legacy>p.max+1e-9)) bad.push([e.type,p.key,'legacy',p.legacy,p.min,p.max]);
        // default must be reachable on the step grid
        if(typeof d==='number'){ const g=Math.round(d/p.step)*p.step; if(Math.abs(g-d)>1e-6*Math.max(1,Math.abs(d))) bad.push([e.type,p.key,'default off-grid',d,p.step]); } } } }); });
  
  FM.fxRegistry.allIncludingHidden().forEach(e=>{ if(!e) return; (e.params||[]).forEach(p=>{ if(p.type==='segment'){ const vals=(p.options||[]).map(o=>Array.isArray(o)?o[0]:o); if(p.default!=null && !vals.some(v=>v==p.default)) bad.push([e.type,p.key,'seg default not an option',p.default,JSON.stringify(vals)]); if(p.legacy!=null && !vals.some(v=>v==p.legacy)) bad.push([e.type,p.key,'seg legacy not an option',p.legacy]); } }); });
  return JSON.stringify({kinds,bad});})()"""
p,call=S.session(9980+port%10)
try:
    call('Page.enable'); call('Runtime.enable')
    call('Emulation.setDeviceMetricsOverride',{'width':800,'height':600,'deviceScaleFactor':1,'mobile':False})
    call('Page.navigate',{'url':'http://localhost:%d/index.html?fmtest=1'%port}); time.sleep(4)
    r=json.loads(S.ev(call,JS)); print(r['kinds']); print(len(r['bad'])); [print(b) for b in r['bad'][:40]]
finally: p.kill()
