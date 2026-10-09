import sys,time,json
sys.path.insert(0,'/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad')
import d4shot as S
port=int(sys.argv[1]); mode=sys.argv[2] if len(sys.argv)>2 else 'apply'
JS="""(async function(){
  let seed=12345; const rnd=()=>{ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; };
  const pick=a=>a[Math.floor(rnd()*a.length)];
  const junk=()=>pick([null,undefined,0,-1,1e9,NaN,'x','',[],{},[1,2],{kf:[]},{kf:[{t:'a',v:null}]},{kf:null},true,'#zzz','__proto__',{a:{b:{c:1}}}]);
  const types=['video','image','shape','text','group','camera','null','adjustment','audio','bogus'];
  const mkLayer=(i)=>{ const L={id:'f'+i,type:pick(types),name:pick(['n','',junk()]),start:pick([0,1,junk()]),duration:pick([1,2,junk()]),transform:pick([{},{x:junk(),y:junk(),scale:junk(),opacity:junk(),rotation:junk()},junk()])};
    ['effects','masks','behaviors','audioFx','captions','crop','stroke','shadow','trimPath','repeater','speed','volume','fill','fillGradient','parent','subs','textAnim','colorGrade','marker'].forEach(k=>{ if(rnd()<0.25) L[k]=junk(); });
    if(rnd()<0.3) L.effects=[{type:pick(['blur','glow','filter','nope',junk()]),enabled:true,params:pick([{},{radius:junk()},junk()]),effects:pick([[],junk()])}];
    if(rnd()<0.2) L.parent=pick(['f0','f1','f'+i,'nope',junk()]);
    return L; };
  const errs={}; let n=0, threw=0;
  for(let t=0;t<%d;t++){
    const count=Math.floor(rnd()*6); const layers=[]; for(let i=0;i<count;i++){ layers.push(rnd()<0.15?junk():mkLayer(i)); }
    const obj={app:'freemotion',project:pick([{name:'x',width:1080,height:1920,fps:30,duration:3,background:'#000000'},{width:junk(),height:junk(),fps:junk(),duration:junk()},{}]),layers:layers,selectedId:junk(),selectedIds:pick([[],junk()])};
    n++; try{ const L0=FM.scene.layers, P0=FM.scene.project; const r=await FM.storage.applyScene(obj); }catch(e){ threw++; const k=String(e&&e.message).slice(0,60)+' @ '+String(e&&e.stack).split(String.fromCharCode(10)).slice(1,3).map(x=>x.trim().split('/js/').pop()).join(' < '); errs[k]=(errs[k]||0)+1; }
  }
  return JSON.stringify({n,threw,errs});
})()"""%(int(sys.argv[3]) if len(sys.argv)>3 else 300)
p,call=S.session(9960+port%10)
try:
    call('Page.enable'); call('Runtime.enable')
    call('Emulation.setDeviceMetricsOverride',{'width':800,'height':600,'deviceScaleFactor':1,'mobile':False})
    call('Page.navigate',{'url':'http://localhost:%d/index.html?fmtest=1'%port}); time.sleep(4)
    r=S.ev(call,JS); print(r)
finally: p.kill()
