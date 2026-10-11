(function(){ const out={};
 try{
  const S=FM.spine; const mk=(over)=>Object.assign({id:'L'+Math.random().toString(36).slice(2,7),type:'video',name:'c.mp4',start:0,duration:2,visible:true,transform:{x:540,y:960,opacity:1,scale:1,rotation:0},effects:[],masks:[],srcW:1080,srcH:1920,srcRev:0,mediaRev:0},over||{});
  const P={width:1080,height:1920,fps:30,duration:30};
  // 1 empty / null
  const r0=S.classify({project:P,layers:[]}); out.empty={main:r0.main.length,end:r0.trackEnd};
  try{ S.classify(null); out.nullScene='ok'; }catch(e){ out.nullScene='THROW '+e.message; }
  try{ S.classify({project:P,layers:[null,undefined,{},{id:'x'}]}); out.junk='ok'; }catch(e){ out.junk='THROW '+e.message; }
  // 2 garbage fields
  const bad=[mk({start:NaN}),mk({duration:'abc'}),mk({transform:null}),mk({effects:null}),mk({effects:[null,{type:'chromakey'}]}),mk({masks:[null]}),mk({parent:'self'}),mk({sm:'x'}),mk({sm:{main:true},audioOnly:true}),mk({type:'text',captions:[],sm:{main:true}}), mk({type:'group',transform:{x:{kf:[]}}}), mk({visible:undefined,start:-5,duration:-1})];
  bad[6].parent=bad[6].id;
  const res=[]; bad.forEach((l,i)=>{ try{ S.classify({project:P,layers:[l]}); res.push('ok'); }catch(e){ res.push(i+':THROW '+e.message); } });
  out.garbage=res.join(' ');
  // 3 project fps zero / negative
  [0,-30,NaN,1e9].forEach(f=>{ try{ const r=S.classify({project:Object.assign({},P,{fps:f}),layers:[mk({start:0,duration:2}),mk({start:2,duration:2})]}); out['fps'+f]='main '+r.main.length; }catch(e){ out['fps'+f]='THROW '+e.message; }});
  // 4 mutation: classify must not change the scene
  const sc={project:P,layers:[mk({start:0,duration:2}),mk({start:2,duration:2}),mk({type:'text',text:'hi',start:1,duration:1}),mk({type:'shape',start:0,duration:5})]};
  const before=JSON.stringify(sc); S.classify(sc); out.mutates= before===JSON.stringify(sc)?'no':'YES';
  const a=JSON.stringify(S.classify(sc).main), b=JSON.stringify(S.classify(sc).main); out.deterministic=a===b;
  // 5 perf
  const big=(n)=>{ const L=[]; for(let i=0;i<n;i++){ const k=i%5; L.push(k<3?mk({start:i*0.5,duration:0.5}):k===3?mk({type:'text',text:'t'+i,start:i*0.3,duration:2}):mk({type:'shape',start:i*0.2,duration:3})); } return {project:Object.assign({},P,{duration:n}),layers:L}; };
  out.perf={}; [100,300,1000,3000].forEach(n=>{ const s=big(n); const t0=performance.now(); S.classify(s); out.perf[n]=Math.round(performance.now()-t0); });
 }catch(e){ out.err=e.message+' '+(e.stack||'').slice(0,300); }
 return JSON.stringify(out); })()
