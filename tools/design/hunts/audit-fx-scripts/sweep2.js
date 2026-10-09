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
 const hash=(a)=>{ let h=2166136261; for(let i=0;i<a.length;i+=7){ h^=a[i]; h=Math.imul(h,16777619); } return h>>>0; };
 const full=(L,t)=>{ const a=draw(L,t,true); let h=2166136261; for(let i=0;i<a.length;i++){ h^=a[i]; h=Math.imul(h,16777619);} return h>>>0; };
 const ts=[0.5,1.7];
 for(const d of defs){ const r={}; const params=d.params||[];
   const e1=FM.fxRegistry.makeInstance(d.type); if(!e1) continue;
   // segment options: default must be one of the option values
   const sp=[]; for(const p of params){ if(p.type==='segment'){ const vals=(p.options||[]).map(o=>Array.isArray(o)?o[0]:(o.value!==undefined?o.value:o)); if(vals.length&&vals.indexOf(p.default)<0) sp.push(p.key+': default '+p.default+' not in '+JSON.stringify(vals)); if(p.legacy!==undefined&&vals.length&&vals.indexOf(p.legacy)<0) sp.push(p.key+': legacy '+p.legacy+' not in '+JSON.stringify(vals)); } }
   if(sp.length) r.segment=sp;
   // ranges: dead zones and out-of-range behaviour
   const dead=[], oor=[], flat=[];
   for(const p of params){ if(p.type!=='range'||!(p.max>p.min)) continue;
     const val=(v)=>{ const e=FM.fxRegistry.makeInstance(d.type); e.params[p.key]=v; return e; };
     const H=(v)=>ts.map(t=>full(mkLayer(val(v)),t)).join('/');
     const N=6; const pts=[]; for(let i=0;i<=N;i++) pts.push(p.min+(p.max-p.min)*i/N);
     let hs; try{ hs=pts.map(H); }catch(e){ r.err=p.key+': '+e.message; continue; }
     const distinct=new Set(hs).size;
     if(distinct===1) flat.push(p.key+' (no visible effect anywhere in '+p.min+'..'+p.max+')');
     else { // the last index at which output still differs from the previous one
       let lastChange=0; for(let i=1;i<=N;i++) if(hs[i]!==hs[i-1]) lastChange=i; if(lastChange<N) dead.push(p.key+' stops changing at '+(+pts[lastChange].toFixed(3))+' of '+p.max); 
       let firstChange=N; for(let i=N;i>=1;i--) if(hs[i]!==hs[i-1]) firstChange=i-1; if(firstChange>0) dead.push(p.key+' no change below '+(+pts[firstChange].toFixed(3))+' (min '+p.min+')'); }
     // out of range = clamped?
     try{ const above=H(p.max+(p.max-p.min)*0.5), at=H(p.max); if(above!==at) oor.push(p.key+' above max renders differently from max'); const below=H(p.min-(p.max-p.min)*0.5), atl=H(p.min); if(below!==atl) oor.push(p.key+' below min renders differently from min'); }catch(e){ oor.push(p.key+' threw '+e.message); } }
   if(dead.length) r.dead=dead; if(oor.length) r.outOfRange=oor; if(flat.length) r.flat=flat;
   out.rows[d.type]=r; }
 }catch(e){out.err=e.message+' '+(e.stack||'').slice(0,300);} return JSON.stringify(out);})()
