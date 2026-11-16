/* probe-counter.js: Number Roll checks for #1243 FX1 r5 (counter). Loaded with &extra=probe-counter.js on truth.html.
   Nothing here writes to the repo; shots go through __h.save to shots/. */
(function(){
'use strict';
const H=()=>window.__h;
function fnv(d){ let h=0x811c9dc5; for(let i=0;i<d.length;i++){ h^=d[i]; h=Math.imul(h,0x01000193)>>>0; } return h.toString(16); }
/* a text-layer scene of our own: font size, alignment and text chosen here */
function textScene(params,o){
  o=o||{};
  const P=o.project||1080, C=P/2, D=o.D||6;
  const L=FM.makeLayer('text',{text:o.text==null?'0':o.text,fontSize:o.fs||150*P/1080,color:o.color||'#e8ecf4',x:o.x==null?C:o.x,y:o.y==null?C:o.y,start:0,duration:D});
  if(o.align) L.align=o.align;
  if(o.bold!=null) L.bold=o.bold;
  if(o.font) L.fontFamily=o.font;
  const inst=FM.fxRegistry.makeInstance(o.type||'counter'); Object.keys(params||{}).forEach(k=>{ inst.params[k]=params[k]; });
  L.effects=[inst];
  return {project:{width:P,height:P,fps:30,duration:D,background:o.bg||'#151a24'},layers:[L]};
}
/* hashes of a list of [params, t] renders, for comparing two renderers */
async function hashes(list,px){
  px=px||360; const [c,g]=H().surface(px), out=[];
  for(const [params,t,o] of list){ const sc=textScene(params,Object.assign({},o||{})); H().paintReal(g,sc,0); H().paintReal(g,sc,t); out.push(fnv(H().pixels(g))); }
  return out;
}
/* ms per render of a scene */
async function timeIt(params,t,n,px,o){
  px=px||1080; n=n||40; const [c,g]=H().surface(px), sc=textScene(params,o);
  H().paintReal(g,sc,t); const t0=performance.now(); for(let i=0;i<n;i++) H().paintReal(g,sc,t+i*1e-4); return (performance.now()-t0)/n;
}
/* frames of our own scenes in a sheet: rows [{label,params,o}], ts */
async function sheet(rows,ts,name,px){
  px=px||360; const C=180, G=10, L=24, W=G+ts.length*(C+G), Hh=G+rows.length*(L+C+G);
  const sh=document.createElement('canvas'); sh.width=Math.max(W,520); sh.height=Hh; const x=sh.getContext('2d');
  x.fillStyle='#0b0e14'; x.fillRect(0,0,sh.width,Hh); x.imageSmoothingQuality='high';
  const [work,wg]=H().surface(px);
  for(let r=0;r<rows.length;r++){ const y0=G+r*(L+C+G), R=rows[r], sc=textScene(R.params,R.o);
    x.fillStyle='#eef1f7'; x.font='600 13px system-ui, sans-serif'; x.fillText(R.label,G,y0+16);
    H().paintReal(wg,sc,0);
    for(let k=0;k<ts.length;k++){ const xa=G+k*(C+G), y=y0+L; H().paintReal(wg,sc,ts[k]); x.drawImage(work,xa,y,C,C); H().caption(x,'t='+ts[k],xa+3,y+C-3); }
  }
  return H().save(sh,name);
}
/* __stack's layout, but waiting on onload: im.decode() never settles in this pane's tab */
async function stack(names,labels,out){
  const ims=[];
  for(const n of names){ const im=new Image(); await new Promise((res,rej)=>{ im.onload=res; im.onerror=()=>rej(new Error('no shot '+n)); im.src='shots/'+encodeURIComponent(n)+'.png?'+Date.now(); }); ims.push(im); }
  const L=28, G=10, W=Math.max(...ims.map(i=>i.width)), Hh=ims.reduce((s,i)=>s+i.height+L+G,G);
  const sh=document.createElement('canvas'); sh.width=W; sh.height=Hh; const x=sh.getContext('2d');
  x.fillStyle='#0b0e14'; x.fillRect(0,0,W,Hh);
  let y=G; ims.forEach((im,k)=>{ x.fillStyle='#ffd27a'; x.font='700 16px system-ui, sans-serif'; x.fillText((labels&&labels[k])||names[k],G,y+19); x.drawImage(im,0,y+L); y+=im.height+L+G; });
  return {saved:await H().save(sh,out||'stack'),width:W,height:Hh};
}
/* OUR TILE beside the REAL effect on a text layer laid out exactly as the tile draws it: the tile's face, size, right edge and middle
   line, Ink on a vermilion project. g: {fs, xr, yy} in the tile's 0..100 units; family: a CSS family that resolves to the tile's face;
   params: the counter's params. Returns per-t: ours-vs-real mean difference (label strip excluded) and each one's change from its 0. */
async function match(g,family,params,ts,name){
  const P=1080, U=P/100, px=360, C=180, G=10, L=24;
  const T=(window.FX_TILES||[]).filter(T=>T.id==='counter').pop(), draw=T.make(px);
  const L0=FM.makeLayer('text',{text:'0',fontSize:g.fs*U,color:'#16130f',x:g.xr*U,y:g.yy*U,start:0,duration:8});
  L0.align='right'; L0.fontFamily=family; L0.bold=false;
  const inst=FM.fxRegistry.makeInstance('counter'); Object.keys(params).forEach(k=>{ inst.params[k]=params[k]; }); L0.effects=[inst];
  const scene={project:{width:P,height:P,fps:30,duration:8,background:'#e4471d'},layers:[L0]};
  const plain={project:scene.project,layers:[Object.assign({},L0,{effects:[]})]};
  const [rc,rg]=H().surface(px), [oc,og]=H().surface(px);
  const y0=Math.round(px*.14);   /* the tile's label sits above this: furniture, not the effect */
  const part=d=>d.slice(y0*px*4);
  H().paintReal(rg,plain,0); const realPlain=part(H().pixels(rg));
  draw(og,0.3); const oursPlain=part(H().pixels(og));
  const sh=document.createElement('canvas'); sh.width=G+ts.length*(2*C+G+4); sh.height=L+C+2*G+18; const x=sh.getContext('2d');
  x.fillStyle='#0b0e14'; x.fillRect(0,0,sh.width,sh.height); x.imageSmoothingQuality='high';
  x.fillStyle='#eef1f7'; x.font='600 13px system-ui, sans-serif'; x.fillText('ours | REAL (effects branch) on a right-aligned text layer, '+family+' '+Math.round(g.fs*U)+'px, '+JSON.stringify(params).slice(0,90),G,16);
  const rows=[]; H().paintReal(rg,scene,0);
  for(let k=0;k<ts.length;k++){ const t=ts[k], xa=G+k*(2*C+G+4), y=L;
    draw(og,t); H().paintReal(rg,scene,t);
    const o=part(H().pixels(og)), r=part(H().pixels(rg));
    x.drawImage(oc,xa,y,C,C); x.drawImage(rc,xa+C+4,y,C,C);
    const dOR=H().diff(o,r), cO=H().diff(o,oursPlain), cR=H().diff(r,realPlain);
    rows.push({t,oursVsReal:dOR.mean,share:+dOR.share.toFixed(4),changeOurs:cO.mean,changeReal:cR.mean});
    H().caption(x,'t='+t+' d='+dOR.mean,xa+3,y+C-3); H().caption(x,'REAL ch='+cR.mean,xa+C+7,y+C-3);
    x.fillStyle='#8b96a8'; x.font='11px ui-monospace, monospace'; x.fillText('ours ch='+cO.mean,xa,y+C+14);
  }
  return {saved:await H().save(sh,name),rows};
}
window.__pc={textScene,hashes,timeIt,sheet,fnv,stack,match};
})();
