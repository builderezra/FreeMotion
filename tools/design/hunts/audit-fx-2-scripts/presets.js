(async function(){ const out={rt:{},cap:{}}; try{
 if(FM.home.isOpen()) FM.home.close();
 const EP=FM.effectPresets; const KEY=EP._storageKey; const keep=localStorage.getItem(KEY); localStorage.removeItem(KEY);
 const said=[]; const rt=FM.toast; FM.toast=m=>said.push(String(m));
 const skip=/^(text|filter)/;
 const defs=FM.fxRegistry.allIncludingHidden().filter(Boolean).filter(d=>!skip.test(d.type));
 const canon=v=>JSON.stringify(v,(k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.keys(x).sort().reduce((o,kk)=>(o[kk]=x[kk],o),{}):x);
 for(const d of defs){ try{
   const e=FM.fxRegistry.makeInstance(d.type); if(!e) continue;
   // animate every keyframable numeric range param with loop mode, and set an odd value on each other kind
   let k=0; for(const p of d.params){ if(p.type==='range'&&p.keyframable!==false&&k<3){ e.params[p.key]={kf:[{t:2,v:p.min+(p.max-p.min)*0.2,e:'linear'},{t:4,v:p.min+(p.max-p.min)*0.8,e:'easeOut'}],loopMode:k===1?'cycle':(k===2?'pingpong':undefined)}; if(!e.params[p.key].loopMode) delete e.params[p.key].loopMode; k++; } }
   const pr=EP.capture(e,'rt '+d.type); if(!pr){ out.rt[d.type]='capture null'; continue; }
   if(!EP.save(pr)){ out.rt[d.type]='save refused: '+said.slice(-1); continue; }
   const back=EP.custom().find(x=>x.id===pr.id); if(!back){ out.rt[d.type]='not read back'; continue; }
   const inst=EP.makeInstance(back,2); if(!inst){ out.rt[d.type]='makeInstance null'; continue; }
   // expected: original params with kf times rebased so earliest = 2 (applied at t=2 -> same absolute times)
   const diffs=[]; for(const p of d.params){ if(p.type==='layer') continue; const a=e.params[p.key], b=inst.params[p.key]; if(canon(a)!==canon(b)) diffs.push(p.key+': '+canon(a).slice(0,60)+' -> '+canon(b).slice(0,60)); }
   if(diffs.length) out.rt[d.type]=diffs.slice(0,4);
   EP.remove(pr.id);
 }catch(err){ out.rt[d.type]='threw '+err.message; } }
 // cap
 localStorage.removeItem(KEY); said.length=0;
 const e0=FM.fxRegistry.makeInstance('blur'); const ids=[];
 for(let i=0;i<125;i++){ e0.params.radius=1+(i%40); const p=EP.capture(e0,'p'+i); p.name='p'+i; const ok=EP.save(p); ids.push(p.id); if(i===119) out.cap.at120={n:readN(),toasts:said.slice()}; }
 function readN(){ try{ return JSON.parse(localStorage.getItem(KEY)).length; }catch(e){return -1;} }
 const names=JSON.parse(localStorage.getItem(KEY)).map(p=>p.name);
 out.cap.final={n:names.length,hasP0:names.includes('p0'),hasP4:names.includes('p4'),hasP5:names.includes('p5'),first:names[0],last:names[names.length-1],toasts:said.slice(-3)};
 // delete: has a way back?
 FM.toast=rt; if(keep===null) localStorage.removeItem(KEY); else localStorage.setItem(KEY,keep);
 }catch(e){out.err=e.message+' '+(e.stack||'').slice(0,200);} return JSON.stringify(out);})()
