/* probe for the Starfield maker (#1246 U3): render the REAL starfield at any size, crop, time it. Loaded by truth.html?extra=probe-starfield.js */
(function(){
'use strict';
const H=()=>window.__h;
/* one real frame: params over the defaults, on a blank layer (or a photo key), project P, rendered at px */
async function frame(params,t,px,photo,P){
  const h=H(); const sc=h.buildScene('starfield',{params:params||{},photo:photo||null,sweep:false,maxT:t,project:P||1080});
  const [c,g]=h.surface(px); h.paintReal(g,sc.scene,0); h.paintReal(g,sc.scene,t); c._warn=sc.warn; return c;
}
/* rows = param sets, cols = ts; each cell `cell` px from a `px` render; crop = [x,y,w,h] in 0..1 of the frame */
async function grid(list,ts,px,cell,name,crop,labels,photo,P){
  const h=H(), G=10, L=22, cols=ts.length, rows=list.length;
  const W=G+cols*(cell+G), Ht=G+rows*(L+cell+G);
  const sh=document.createElement('canvas'); sh.width=Math.max(W,420); sh.height=Ht; const x=sh.getContext('2d');
  x.fillStyle='#0b0e14'; x.fillRect(0,0,sh.width,Ht); x.imageSmoothingQuality='high';
  const warn=[];
  for(let r=0;r<rows;r++){
    const y0=G+r*(L+cell+G);
    x.fillStyle='#eef1f7'; x.font='600 13px system-ui, sans-serif';
    x.fillText((labels&&labels[r])||JSON.stringify(list[r]),G,y0+15);
    for(let k=0;k<cols;k++){
      const c=await frame(list[r],ts[k],px,photo,P); (c._warn||[]).forEach(w=>warn.push(w));
      const cr=crop||[0,0,1,1];
      x.drawImage(c,cr[0]*px,cr[1]*px,cr[2]*px,cr[3]*px,G+k*(cell+G),y0+L,cell,cell);
      h.caption(x,'t='+ts[k],G+k*(cell+G)+3,y0+L+cell-3);
      await h.yieldNow();
    }
  }
  return {saved:await h.save(sh,name),warn};
}
/* ms per real frame at px (after a warm-up) */
async function time(params,t,px,n,P){
  const h=H(); const sc=h.buildScene('starfield',{params:params||{},sweep:false,maxT:t+n,project:P||1080});
  const [c,g]=h.surface(px); h.paintReal(g,sc.scene,t);
  const t0=performance.now(); for(let i=0;i<n;i++) h.paintReal(g,sc.scene,t+i*0.033); return +((performance.now()-t0)/n).toFixed(1);
}
/* lit-pixel stats of a frame: share of pixels brighter than thr, mean luma, any NaN-black holes */
async function stats(params,t,px,P){
  const c=await frame(params,t,px,null,P), d=c.getContext('2d').getImageData(0,0,px,px).data;
  let lit=0,sum=0; for(let i=0;i<d.length;i+=4){ const v=(d[i]+d[i+1]+d[i+2])/3; sum+=v; if(v>40) lit++; }
  return {lit:+(lit/(px*px)).toFixed(4),mean:+(sum/(px*px)).toFixed(2)};
}
/* __stack's own layout, but waiting on onload: im.decode() never settles in a tab the pane is not showing */
async function stack(names,labels,out){
  const h=H(), ims=[];
  for(const n of names){ const im=new Image(); await new Promise((res,rej)=>{ im.onload=res; im.onerror=()=>rej(new Error('no shot '+n)); im.src='shots/'+encodeURIComponent(n)+'.png?'+Date.now(); }); ims.push(im); }
  const L=28, G=10, W=Math.max(...ims.map(i=>i.width)), Ht=ims.reduce((s,i)=>s+i.height+L+G,G);
  const sh=document.createElement('canvas'); sh.width=W; sh.height=Ht; const x=sh.getContext('2d');
  x.fillStyle='#0b0e14'; x.fillRect(0,0,W,Ht);
  let y=G; ims.forEach((im,k)=>{ x.fillStyle='#ffd27a'; x.font='700 16px system-ui, sans-serif'; x.fillText((labels&&labels[k])||names[k],G,y+19); x.drawImage(im,0,y+L); y+=im.height+L+G; });
  return {saved:await h.save(sh,out||'stack'),width:W,height:Ht};
}
/* OUR tile's change against its own ground (the colour of its first pixel row's corner at rest), same measure as __truth's */
function ours(ts,px,ground){
  px=px||360; const T=(window.FX_TILES||[]).filter(x=>x.id==='starfield').pop(), draw=T.make(px);
  const [c,g]=H().surface(px), [c0,g0]=H().surface(px); g0.fillStyle=ground||'#0c0c0d'; g0.fillRect(0,0,px,px); const base=H().pixels(g0);
  return ts.map(t=>{ draw(g,t); return H().diff(H().pixels(g),base).mean; });
}
/* the REAL change against the plain layer, at any project size */
async function realChange(params,ts,px,P){
  const h=H(), sc=h.buildScene('starfield',{params,sweep:false,maxT:Math.max(...ts),project:P||1080}), [c,g]=h.surface(px||360);
  h.paintReal(g,sc.plain,0); const base=h.pixels(g).slice(); h.paintReal(g,sc.scene,0);
  const out=[]; for(const t of ts){ h.paintReal(g,sc.scene,t); out.push(h.diff(h.pixels(g),base).mean); } return out;
}
/* ours beside the real one, big: one row per t, [ours | real], each `cell` px from a `px` render; crop = [x,y,w,h] in 0..1 */
async function pair(params,ts,px,cell,name,P,crop){
  const h=H(), T=(window.FX_TILES||[]).filter(x=>x.id==='starfield').pop(), draw=T.make(px), [tc,tg]=h.surface(px);
  const sc=h.buildScene('starfield',{params,sweep:false,maxT:Math.max(...ts),project:P||1080}), [rc,rg]=h.surface(px); h.paintReal(rg,sc.scene,0);
  const G=10, L=20, W=G+2*(cell+G), Ht=G+ts.length*(L+cell+G), sh=document.createElement('canvas'); sh.width=W; sh.height=Ht; const x=sh.getContext('2d');
  x.fillStyle='#0b0e14'; x.fillRect(0,0,W,Ht); x.imageSmoothingQuality='high'; const cr=crop||[0,0,1,1];
  for(let k=0;k<ts.length;k++){ const y0=G+k*(L+cell+G), t=ts[k];
    draw(tg,t); h.paintReal(rg,sc.scene,t);
    x.fillStyle='#eef1f7'; x.font='600 13px system-ui, sans-serif'; x.fillText('t='+t+'   ours | REAL',G,y0+14);
    x.drawImage(tc,cr[0]*px,cr[1]*px,cr[2]*px,cr[3]*px,G,y0+L,cell,cell); x.drawImage(rc,cr[0]*px,cr[1]*px,cr[2]*px,cr[3]*px,2*G+cell,y0+L,cell,cell);
    await h.yieldNow(); }
  return {saved:await h.save(sh,name)};
}
/* tuning: rows of {cfg (window.__sfTune), params (real)}: ours at t0 and t1 (cell px), ours at 77 px (from a 300 render, as the menu), real at t1 */
async function variants(rows,t0,t1,cell,name,labels){
  const h=H(), G=10, L=20, W=G+3*(cell+G)+77+G, Ht=G+rows.length*(L+cell+G), sh=document.createElement('canvas'); sh.width=W; sh.height=Ht; const x=sh.getContext('2d');
  x.fillStyle='#0b0e14'; x.fillRect(0,0,W,Ht); x.imageSmoothingQuality='high';
  for(let r=0;r<rows.length;r++){ const y0=G+r*(L+cell+G), row=rows[r];
    window.__sfTune=row.cfg; const T=(window.FX_TILES||[]).filter(q=>q.id==='starfield').pop();
    const d2=T.make(cell*2), [c2,g2]=h.surface(cell*2), d3=T.make(300), [c3,g3]=h.surface(300);
    x.fillStyle='#eef1f7'; x.font='600 12px system-ui, sans-serif'; x.fillText((labels&&labels[r])||JSON.stringify(row.cfg),G,y0+14);
    d2(g2,t0); x.drawImage(c2,G,y0+L,cell,cell); d2(g2,t1); x.drawImage(c2,2*G+cell,y0+L,cell,cell);
    d3(g3,t1); x.drawImage(c3,G+3*(cell+G),y0+L,77,77);
    const sc=h.buildScene('starfield',{params:row.params,sweep:false,maxT:t1,project:row.cfg.proj||720}), [rc,rg]=h.surface(cell*2); h.paintReal(rg,sc.scene,0); h.paintReal(rg,sc.scene,t1);
    x.drawImage(rc,3*G+2*cell,y0+L,cell,cell); h.caption(x,'REAL t='+t1,3*G+2*cell+3,y0+L+cell-3); h.caption(x,'ours t='+t1,2*G+cell+3,y0+L+cell-3);
    await h.yieldNow(); }
  window.__sfTune=null;
  return {saved:await h.save(sh,name)};
}
window.__sf={frame,grid,time,stats,stack,ours,realChange,pair,variants};
})();
