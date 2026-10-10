(function(){ const out={};
 try{
  const S=FM.spine; const mk=(over)=>Object.assign({id:'L'+(mk.n=(mk.n||0)+1),type:'video',name:'c.mp4',start:0,duration:2,visible:true,muted:false,transform:{x:540,y:960,opacity:1,scale:1,rotation:0},effects:[],masks:[],srcW:1080,srcH:1920,srcRev:0,mediaRev:0},over||{});
  const P={width:1080,height:1920,fps:30,duration:30,sm:{v:1,adopted:true}};
  // 1. adopted: the second main clip has static opacity 0 (a clip faded out for the whole stretch)
  const a=mk({start:0,duration:2,sm:{main:true}}), b=mk({start:2,duration:2,sm:{main:true},transform:{x:540,y:960,opacity:0,scale:1,rotation:0}}), c=mk({start:4,duration:2,sm:{main:true}});
  const r=S.classify({project:P,layers:[c,b,a]});
  out.adoptedOpacity0={mainIds:r.main.map(e=>e.id),expect:[a.id,b.id,c.id],kindB:r.units[b.id].kind,anomalies:r.anomalies.map(x=>x.kind)};
  // same, not adopted
  const r2=S.classify({project:{width:1080,height:1920,fps:30,duration:30},layers:[mk({start:4,duration:2}),mk({start:2,duration:2,transform:{x:540,y:960,opacity:0,scale:1,rotation:0}}),mk({start:0,duration:2})]});
  out.derivedOpacity0={main:r2.main.length};
  // 5. setFlag vs sanitiser: every sequence of up to 3 flag writes on 5 layer shapes must leave a layer the sanitiser does not change
  const shapes={video:()=>mk(),audioOnly:()=>mk({audioOnly:true}),captions:()=>mk({type:'text',captions:[]}),text:()=>mk({type:'text',text:'a'}),group:()=>mk({type:'group'})};
  const FL=['main','stay','tail','twin','muteByMode','unit']; const bad=[]; let n=0;
  const san=l=>{ const c=JSON.parse(JSON.stringify(l)); FM.storage._sanitizeSm(c); return JSON.stringify(c.sm)+'|'+JSON.stringify(c.pick); };
  Object.keys(shapes).forEach(sn=>{ FL.forEach(f1=>FL.forEach(f2=>FL.forEach(f3=>[true,false].forEach(o1=>[true,false].forEach(o2=>[true,false].forEach(o3=>{ const l=shapes[sn](); S.setFlag(l,f1,o1); S.setFlag(l,f2,o2); S.setFlag(l,f3,o3); n++; const before=JSON.stringify(l.sm)+'|'+JSON.stringify(l.pick); if(before!==san(l)) bad.push(sn+':'+f1+o1+','+f2+o2+','+f3+o3+' '+before+' -> '+san(l)); })))))); });
  out.setFlag={combos:n,disagree:bad.length,first:bad.slice(0,5)};
 }catch(e){ out.err=e.message+' '+(e.stack||'').slice(0,300); }
 return JSON.stringify(out); })()
