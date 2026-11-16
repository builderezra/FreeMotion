/* probe-fractalridges.js (round 5, Rock Noise): custom subjects for real-renderer frames.
   Load with truth.html?app=/ss/&extra=probe-fractalridges.js. Reads only; writes PNGs through __h.save. */
(function(){
'use strict';
const H=window.__h;
/* the massif silhouette, in 0..100 units: the SAME function as tiles-h11.js uses (keep the two in step) */
function ridgePts(){
  const K=window.__frK||[[-2,41],[7,37],[15,31.5],[22,24],[29,14.5],[34,19],[40,25.5],[46,23],[52,20],[58,24.5],[66,29],[74,31],[80,35.5],[89,37.5],[102,42]];
  const r=FXK.rng(window.__frSeed||1243011);
  let pts=K.map(p=>p.slice());
  const amps=window.__frAmps||[2.2,2.0,1.6,1.1,.7,.4];
  for(const a of amps){ const out=[pts[0]]; for(let i=1;i<pts.length;i++){ const p=pts[i-1], q=pts[i]; out.push([(p[0]+q[0])/2+(r()-.5)*a*.3,(p[1]+q[1])/2+(r()-.5)*a]); out.push(q); } pts=out; }
  return pts;
}
function massifPath(){ const p=new Path2D(), pts=ridgePts(); pts.forEach((q,i)=>i?p.lineTo(q[0],q[1]):p.moveTo(q[0],q[1])); p.lineTo(102,102); p.lineTo(-2,102); p.closePath(); return p; }
function massifCanvas(S,fill){ const c=document.createElement('canvas'); c.width=c.height=S; const g=c.getContext('2d'); g.setTransform(S/100,0,0,S/100,0,0); g.fillStyle=fill; g.fill(massifPath()); return c; }
function flatCanvas(S,fill){ const c=document.createElement('canvas'); c.width=c.height=S; const g=c.getContext('2d'); g.fillStyle=fill; g.fillRect(0,0,S,S); return c; }
let seq=0;
function scene(o){
  const P=o.project||1080, C=P/2, D=8, tag='_fr'+(++seq)+'_';
  let hero, layers;
  if(o.subject==='massif'){ hero=H.imageLayer(tag+'m',massifCanvas(P,o.fill||'#3d4554'),P,C,C,D); layers=[hero,H.imageLayer(tag+'s',flatCanvas(P,o.sky||'#161c28'),P,C,C,D)]; }
  else if(o.subject==='text'){ hero=FM.makeLayer('text',{text:o.text||'ROCK',fontSize:o.fontSize||330,color:o.fill||'#e8ecf4',x:C,y:C,start:0,duration:D,fontFamily:o.font||'Arial Black, Inter, sans-serif'}); hero.bold=true; layers=[hero,H.imageLayer(tag+'s',flatCanvas(P,o.sky||'#161c28'),P,C,C,D)]; }
  else if(o.subject&&o.subject.indexOf('photo:')===0){ hero=H.imageLayer(tag+'p',H.photoEl(o.subject.slice(6)),P,C,C,D); layers=[hero]; }
  else { hero=FM.makeLayer('shape',{shape:'rect',shapeW:P,shapeH:P,fill:o.fill||'#0b0e14',x:C,y:C,start:0,duration:D}); layers=[hero]; }
  const inst=FM.fxRegistry.makeInstance('fractalridges');
  Object.assign(inst.params,o.params||{});
  if(o.colors){ inst.params.color=o.colors[0]; inst.params.color2=o.colors[1]; }
  (o.drop||[]).forEach(k=>{ delete inst.params[k]; });
  hero.effects=o.noFx?[]:[inst];
  return {project:{width:P,height:P,fps:30,duration:D,background:'#151a24'},layers};
}
/* rows: [{label, subject, params, colors, fill, sky, noFx}], one row each, one cell per t, plus the last cell at 77 px */
async function sheet(rows,ts,name,px){
  px=px||360; ts=(ts&&ts.length)?ts:[0,1.2,2.4];
  const C=180, G=10, L=24, W=G+ts.length*(C+G)+77+G, HH=G+rows.length*(L+C+G);
  const sh=document.createElement('canvas'); sh.width=Math.max(W,560); sh.height=HH; const x=sh.getContext('2d');
  x.fillStyle='#0b0e14'; x.fillRect(0,0,sh.width,HH); x.imageSmoothingQuality='high';
  const [work,wg]=H.surface(px), errors=[], change=[];
  for(let r=0;r<rows.length;r++){
    const row=rows[r], y0=G+r*(L+C+G);
    x.fillStyle='#eef1f7'; x.font='600 13px system-ui, sans-serif'; x.fillText(row.label||JSON.stringify(row.params||{}),G,y0+16);
    let sc, plain;
    try{ sc=scene(row); plain=scene(Object.assign({},row,{noFx:true})); H.paintReal(wg,plain,0); var pp=H.pixels(wg).slice(); H.paintReal(wg,sc,0); }catch(e){ errors.push(r+': '+e.message); continue; }
    const ch=[];
    for(let k=0;k<ts.length;k++){ const xa=G+k*(C+G), y=y0+L;
      try{ H.paintReal(wg,sc,ts[k]); x.drawImage(work,xa,y,C,C); ch.push(H.diff(H.pixels(wg),pp).mean); }catch(e){ errors.push(r+'@'+ts[k]+': '+e.message); H.badCell(x,xa,y,C,e.message); }
      H.caption(x,'t='+ts[k],xa+3,y+C-3); }
    x.drawImage(work,G+ts.length*(C+G),y0+L,77,77);
    change.push(ch);
    await H.yieldNow();
  }
  return {saved:await H.save(sh,name||'fr-sheet'),errors,change};
}
/* one frame of a custom scene at px, kept as window.__frLast */
function frame(o,t,px){ const [c,g]=H.surface(px||360); const sc=scene(o); H.paintReal(g,sc,0); H.paintReal(g,sc,t||0); return window.__frLast=c; }
/* the kernel alone, on a W x H flat buffer: ms per call */
function timeKernel(params,W,HH,n,ps){ n=n||3; const d=new Uint8ClampedArray(W*HH*4); const f=FM._pixelFx.fractalridges; let best=1e9, tot=0;
  for(let i=0;i<n;i++){ for(let j=0;j<d.length;j+=4){ d[j]=60; d[j+1]=66; d[j+2]=80; d[j+3]=255; } const t0=performance.now(); f(d,W,HH,params,0.4+i*.1,ps||1); const dt=performance.now()-t0; tot+=dt; if(dt<best) best=dt; }
  return {best:+best.toFixed(1),mean:+(tot/n).toFixed(1)}; }
/* the kernel on a buffer: returns the RGBA */
function kern(params,W,HH,t,ps,fill){ const d=new Uint8ClampedArray(W*HH*4); for(let j=0;j<d.length;j+=4){ d[j]=fill[0]; d[j+1]=fill[1]; d[j+2]=fill[2]; d[j+3]=255; } FM._pixelFx.fractalridges(d,W,HH,params,t,ps); return d; }
/* a grid of single frames: cells [{label, ...scene opts, t}], cols, cell px; each cell shows the frame big and at 77 px */
async function grid(cells,cols,cell,name){
  cols=cols||4; cell=cell||220; const G=10, L=20, CW=cell+77+G, W=G+cols*(CW+G), rows=Math.ceil(cells.length/cols), HH=G+rows*(L+cell+G);
  const sh=document.createElement('canvas'); sh.width=W; sh.height=HH; const x=sh.getContext('2d');
  x.fillStyle='#0b0e14'; x.fillRect(0,0,W,HH); x.imageSmoothingQuality='high';
  const [work,wg]=H.surface(360), errors=[];
  for(let i=0;i<cells.length;i++){ const o=cells[i], cx=G+(i%cols)*(CW+G), cy=G+Math.floor(i/cols)*(L+cell+G);
    x.fillStyle='#eef1f7'; x.font='600 12px system-ui, sans-serif'; x.fillText(o.label||'',cx,cy+14);
    try{ const sc=scene(o); H.paintReal(wg,sc,0); H.paintReal(wg,sc,o.t||0); x.drawImage(work,cx,cy+L,cell,cell); x.drawImage(work,cx+cell+G,cy+L,77,77); }catch(e){ errors.push(i+': '+e.message); }
    await H.yieldNow(); }
  return {saved:await H.save(sh,name||'fr-grid'),errors};
}
/* __stack's twin that does not wait on img.decode() (it never settled in an unfronted tab): fetch + createImageBitmap */
async function stack2(names,labels,out){
  const ims=[];
  for(const n of names){ const b=await (await fetch('shots/'+encodeURIComponent(n)+'.png?'+Date.now())).blob(); ims.push(await createImageBitmap(b)); }
  const L=28, G=10, W=Math.max(...ims.map(i=>i.width)), HH=ims.reduce((s,i)=>s+i.height+L+G,G);
  const sh=document.createElement('canvas'); sh.width=W; sh.height=HH; const x=sh.getContext('2d');
  x.fillStyle='#0b0e14'; x.fillRect(0,0,W,HH);
  let y=G; ims.forEach((im,k)=>{ x.fillStyle='#ffd27a'; x.font='700 16px system-ui, sans-serif'; x.fillText((labels&&labels[k])||names[k],G,y+19); x.drawImage(im,0,y+L); y+=im.height+L+G; });
  return {saved:await H.save(sh,out||'stack'),width:W,height:HH};
}
/* OUR tile (the live copy) beside the REAL effect on the identical subject: same massif, same sky, same settings.
   Returns per-state numbers: ours vs real (mean abs per channel), and each one's change from its own plain layer. */
async function vsTile(px,tOn,tOff,params,name){
  const T=(window.FX_TILES||[]).filter(T=>T.id==='fractalridges').pop();
  const draw=T.make(px), [tc,tg]=H.surface(px);
  draw(tg,tOff); const oursOff=H.pixels(tg).slice(); const offCv=document.createElement('canvas'); offCv.width=offCv.height=px; offCv.getContext('2d').drawImage(tc,0,0);
  draw(tg,tOn); const oursOn=H.pixels(tg).slice(); const onCv=document.createElement('canvas'); onCv.width=onCv.height=px; onCv.getContext('2d').drawImage(tc,0,0);
  const rOn=frame({subject:'massif',params},tOn,px); const realOn=H.pixels(rOn.getContext('2d')).slice(); const rOnCv=document.createElement('canvas'); rOnCv.width=rOnCv.height=px; rOnCv.getContext('2d').drawImage(rOn,0,0);
  const rOff=frame({subject:'massif',params,noFx:true},tOn,px); const realOff=H.pixels(rOff.getContext('2d')).slice(); const rOffCv=document.createElement('canvas'); rOffCv.width=rOffCv.height=px; rOffCv.getContext('2d').drawImage(rOff,0,0);
  /* the export: the real effect at a 1080 plate, scaled down to px */
  const rBig=frame({subject:'massif',params},tOn,1080); const [ec,eg]=H.surface(px); eg.imageSmoothingQuality='high'; eg.drawImage(rBig,0,0,px,px); const realExp=H.pixels(eg).slice();
  const out={ours_vs_real_on:H.diff(oursOn,realOn), ours_vs_real_off:H.diff(oursOff,realOff), ours_vs_export_on:H.diff(oursOn,realExp), real_vs_export_on:H.diff(realOn,realExp),
    change_ours:H.diff(oursOn,oursOff).mean, change_real:H.diff(realOn,realOff).mean, change_export:H.diff(realExp,realOff).mean};
  if(name){ const C=240, G=10, L=22, cols=[[offCv,'OURS flat (t='+tOff+')'],[onCv,'OURS stone (t='+tOn+')'],[rOnCv,'REAL /ss/ plate '+px],[ec,'REAL export 1080, scaled']];
    const sh=document.createElement('canvas'); sh.width=G+cols.length*(C+G); sh.height=G+L+C+G+L+77+G; const x=sh.getContext('2d'); x.fillStyle='#0b0e14'; x.fillRect(0,0,sh.width,sh.height); x.imageSmoothingQuality='high';
    cols.forEach((q,k)=>{ const xa=G+k*(C+G); x.fillStyle='#ffd27a'; x.font='700 12px system-ui'; x.fillText(q[1],xa,G+14); x.drawImage(q[0],xa,G+L,C,C); x.drawImage(q[0],xa,G+L+C+G+L-8,77,77); });
    x.fillStyle='#eef1f7'; x.font='600 12px system-ui'; x.fillText('ours vs real '+out.ours_vs_real_on.mean+' | change ours '+out.change_ours+' real '+out.change_real+' export '+out.change_export,G,G+L+C+G+12);
    out.saved=await H.save(sh,name); }
  return out;
}
window.__fr={ridgePts,massifPath,massifCanvas,scene,sheet,frame,timeKernel,kern,grid,stack2,vsTile};
})();
