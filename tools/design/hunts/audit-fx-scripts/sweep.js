(async function(){ const out={rows:{},meta:{}}; try{
 if(FM.home.isOpen()) FM.home.close();
 const W=320,H=240; const P=FM.scene.project; P.width=W;P.height=H;P.duration=4;P.background='#202830';
 const sc=document.createElement('canvas'); sc.width=W; sc.height=H; const g=sc.getContext('2d');
 const gr=g.createLinearGradient(0,0,W,H); gr.addColorStop(0,'#e8553a'); gr.addColorStop(.5,'#3ab0e8'); gr.addColorStop(1,'#f2e04a'); g.fillStyle=gr; g.fillRect(0,0,W,H);
 g.fillStyle='#111'; g.fillRect(40,40,90,60); g.fillStyle='#fff'; g.beginPath(); g.arc(220,150,50,0,7); g.fill(); g.strokeStyle='#000'; g.lineWidth=4; for(let i=0;i<8;i++){g.beginPath();g.moveTo(10+i*38,0);g.lineTo(30+i*38,H);g.stroke();} g.fillStyle='#fff'; g.font='bold 40px sans-serif'; g.fillText('AB12',50,200);
 const blob=await new Promise(r=>sc.toBlob(r,'image/png')); const rec=await FM.loadImageFile(new File([blob],'t.png',{type:'image/png'}));
 const skip=/^(text|filter|cube3d|box3d|cylinder3d|sphere3d|ellipsoid3d|torus3d|ring3d|pyramid3d|octahedron3d|hexprism3d|starprism3d|starpoly3d|heart3d|hollowbox3d|axiscross3d|counter|timecode|particles|weather)/;
 const defs=FM.fxRegistry.allIncludingHidden().filter(Boolean).filter(d=>!skip.test(d.type));
 out.meta.count=defs.length;
 const mkLayer=(eff)=>{ const L=FM.makeLayer('image',{name:'src',x:W/2,y:H/2,start:0,duration:4}); L.transform.scale=1; FM.media.set(L.id,rec); L.effects=eff?[eff]:[]; return L; };
 const draw=(L,t,ghost)=>{ const c=document.createElement('canvas'); c.width=W;c.height=H; c.__fmRS=1; c.__fmOX=0; c.__fmOY=0; const g0=FM._mfGhost; if(ghost) FM._mfGhost=1; try{ FM.renderScene(c.getContext('2d'),{project:P,layers:[L],selectedId:null,selectedIds:[]},t);}finally{FM._mfGhost=g0;} return c.getContext('2d').getImageData(0,0,W,H).data; };
 const same=(a,b)=>{ for(let i=0;i<a.length;i++) if(a[i]!==b[i]) return false; return true; };
 for(const d of defs){ const r={}; const params=d.params||[];
   // a) static integrity
   const prob=[]; for(const p of params){ if(p.type==='range'){ if(!(typeof p.default==='number'&&isFinite(p.default))) prob.push(p.key+': default not a number'); else if(p.default<p.min-1e-9||p.default>p.max+1e-9) prob.push(p.key+': default '+p.default+' outside '+p.min+'..'+p.max); if(!(p.min<p.max)) prob.push(p.key+': min>=max'); if(typeof p.legacy==='number'&&(p.legacy<p.min-1e-9||p.legacy>p.max+1e-9)) prob.push(p.key+': legacy '+p.legacy+' outside '+p.min+'..'+p.max); if(!(p.step>0)) prob.push(p.key+': step '+p.step); }
     else if(p.type==='segment'){ const vals=(p.options||[]).map(o=>o.value!==undefined?o.value:o); if(vals.length&&vals.indexOf(p.default)<0) prob.push(p.key+': default '+JSON.stringify(p.default)+' not in options'); if(p.legacy!==undefined&&vals.length&&vals.indexOf(p.legacy)<0) prob.push(p.key+': legacy not in options'); } }
   if(prob.length) r.static=prob;
   // b) old save (params absent) vs defaults
   try{ const e1=FM.fxRegistry.makeInstance(d.type); const e0={type:d.type,enabled:true,params:{}}; const L1=mkLayer(e1), L0=mkLayer(e0);
     const noLegacy=params.filter(p=>p.legacy===undefined||p.legacy===p.default).length; 
     const diffs=[]; for(const t of [0.5,1.7]){ const a=draw(L1,t,true), b=draw(L0,t,true); if(!same(a,b)) diffs.push(t); }
     if(diffs.length){ // which params explain it? set each missing param individually
       const cul=[]; for(const p of params){ if(p.default===undefined) continue; const e2={type:d.type,enabled:true,params:{}}; Object.keys(e1.params).forEach(k=>{ if(k!==p.key) e2.params[k]=e1.params[k]; }); const L2=mkLayer(e2); if(same(draw(L2,diffs[0],true),draw(L1,diffs[0],true))) continue; cul.push(p.key+(p.legacy!==undefined?'(legacy '+JSON.stringify(p.legacy)+' vs default '+JSON.stringify(p.default)+')':'(no legacy)')); }
       r.oldSave=cul.length?cul:['differs, no single param explains it']; }
   }catch(e){ r.oldSaveErr=e.message; }
   // c) no-op probe vs reality
   try{ const e1=FM.fxRegistry.makeInstance(d.type); const L=mkLayer(e1); FM.scene.layers.length=0; FM.scene.layers.push(L); FM.time=1;
     const probe=FM.fxThumbs.effectDoesNothing(L,0); 
     const eoff=JSON.parse(JSON.stringify(e1)); eoff.enabled=false; const Loff=mkLayer(eoff);
     let changed=false; for(const t of [0.1,0.9,1,1.6,2.4,3.3]){ const a=draw(L,t,true), b=draw(Loff,t,true); if(!same(a,b)){ changed=true; break; } }
     r.probe=probe; r.realChange=changed;
     if(probe===true&&changed) r.probeWrong='says does nothing, but changes pixels';
     if(probe===false&&!changed) r.probeWrong='says it shows, but no change in 6 moments';
   }catch(e){ r.probeErr=e.message; }
   out.rows[d.type]=r; }
 }catch(e){out.err=e.message+' '+(e.stack||'').slice(0,300);} return JSON.stringify(out);})()
