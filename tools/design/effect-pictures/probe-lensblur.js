/* probe-lensblur.js: Lens Blur (#1246 U4) A/B sheets, timing and the 30-34 px hand-over, through the REAL renderer (window.__h).
   Loaded by truth.html?app=/app/|/ss/&extra=probe-lensblur.js. Writes only shots/r5-lensblur-*.png through the site's /shot. */
(function(){
'use strict';
const H=window.__h;
const yieldNow=H.yieldNow;

/* one cell: the real render of lensblur with these params on this photo, at px, at time t */
function renderCell(params,photo,t,px){
  const sc=H.buildScene('lensblur',{params,photo,sweep:false,maxT:t||0});
  const [c,g]=H.surface(px);
  H.paintReal(g,sc.scene,0); H.paintReal(g,sc.scene,t||0);
  return {c,g,warn:sc.warn,on:sc.on};
}

/* sheet: rows = [{label, photo}], cols = [{label, params}]; title on top; cell px C */
async function sheet(name,title,rows,cols,opts){
  opts=opts||{};
  const C=opts.cell||220, G=10, L=40, T=30, px=opts.px||360, t=opts.t||0.6;
  const W=G+cols.length*(C+G), Hh=T+rows.length*(L+C+G)+G;
  const sh=document.createElement('canvas'); sh.width=W; sh.height=Hh; const x=sh.getContext('2d');
  x.fillStyle='#0b0e14'; x.fillRect(0,0,W,Hh); x.imageSmoothingQuality='high';
  x.fillStyle='#ffd27a'; x.font='700 15px system-ui, sans-serif'; x.fillText(title,G,20);
  const warn=[];
  for(let r=0;r<rows.length;r++){
    const y0=T+r*(L+C+G);
    for(let k=0;k<cols.length;k++){
      const xa=G+k*(C+G);
      x.fillStyle='#eef1f7'; x.font='600 12px system-ui, sans-serif';
      const lines=String(cols[k].label).split('\n');
      lines.forEach((s,i)=>x.fillText(s,xa,y0+14+i*14));
      try{ const R=renderCell(cols[k].params,rows[r].photo,t,px); R.warn.forEach(w=>warn.push(w)); x.drawImage(R.c,xa,y0+L,C,C); }
      catch(e){ warn.push(e.message); H.badCell(x,xa,y0+L,C,e.message); }
      await yieldNow();
    }
  }
  return {saved:await H.save(sh,name),warn,size:[W,Hh]};
}

/* ms per real frame at px, over n renders at different t (the effect is static; t moves so no cache can answer) */
async function time(params,photo,px,n){
  n=n||4; px=px||1080;
  const sc=H.buildScene('lensblur',{params,photo,sweep:false,maxT:n});
  const [c,g]=H.surface(px);
  H.paintReal(g,sc.scene,0);
  const ms=[];
  for(let i=1;i<=n;i++){ const t0=performance.now(); H.paintReal(g,sc.scene,i*0.37); ms.push(Math.round(performance.now()-t0)); await yieldNow(); }
  return {params:JSON.stringify(params),px,ms,median:ms.slice().sort((a,b)=>a-b)[Math.floor(ms.length/2)]};
}

/* the hand-over: mean change between consecutive radii, and against the plain photo */
async function rack(radii,extra,photo,px){
  px=px||360; const out=[]; let prev=null;
  const plain=H.pixels(renderCell({radius:0},photo,0.6,px).g).slice();
  for(const r of radii){
    const p=Object.assign({},extra||{},{radius:r});
    const R=renderCell(p,photo,0.6,px), d=H.pixels(R.g).slice();
    let nan=0, black=0; for(let i=0;i<d.length;i+=4){ if(d[i]+d[i+1]+d[i+2]===0) black++; }
    out.push({r,vsPlain:H.diff(d,plain).mean,vsPrev:prev?H.diff(d,prev).mean:null,black});
    prev=d; await yieldNow();
  }
  return out;
}

/* a single real frame saved at px (for looking hard at artefacts) */
async function one(params,photo,px,name,t){
  const R=renderCell(params,photo,t||0.6,px);
  return {saved:await H.save(R.c,name),warn:R.warn};
}

/* a layer smaller than the frame (a card on the app backdrop): renders a scene with the photo layer at a given size */
async function card(params,photo,px,name,size){
  const sc=H.buildScene('lensblur',{params,photo,sweep:false,maxT:1});
  const hero=sc.scene.layers[0]; const P=sc.scene.project.width;
  const el=H.photoEl(photo), sz=size||Math.round(P*0.45);
  const L=H.imageLayer('_lbcard_'+Math.random().toString(36).slice(2),el,sz,P/2,P/2,4); L.effects=hero.effects;
  const bg=H.imageLayer('_lbbg_'+Math.random().toString(36).slice(2),H.painted('flat',(x,s)=>{ x.fillStyle='#2a3140'; x.fillRect(0,0,s,s); }),P,P/2,P/2,4);
  const scene={project:sc.scene.project,layers:[L,bg]};
  const [c,g]=H.surface(px); H.paintReal(g,scene,0); H.paintReal(g,scene,0.6);
  const t0=performance.now(); H.paintReal(g,scene,0.9); const ms=Math.round(performance.now()-t0);
  return {saved:await H.save(c,name),ms};
}

/* the aperture itself (point-spread): a near-black layer with small white points, so each point draws the disc the effect uses */
function psfScene(params){
  const P=1080, el=H.painted('lbpsf',(x,s)=>{ x.fillStyle='#08090b'; x.fillRect(0,0,s,s); x.fillStyle='#fff';
    [[.25,.25],[.75,.25],[.5,.5],[.25,.75],[.75,.75]].forEach(([a,b])=>{ x.beginPath(); x.arc(a*s,b*s,s*.006,0,Math.PI*2); x.fill(); }); });
  const L=H.imageLayer('_lbpsf_'+Math.random().toString(36).slice(2),el,P,P/2,P/2,4);
  const inst=FM.fxRegistry.makeInstance('lensblur'); Object.assign(inst.params,params||{}); L.effects=[inst];
  return {project:{width:P,height:P,fps:30,duration:4,background:'#000'},layers:[L]};
}
async function psfSheet(name,title,cols,px){
  px=px||360; const C=220, G=10, L=30, T=30;
  const W=G+cols.length*(C+G), Hh=T+L+C+G;
  const sh=document.createElement('canvas'); sh.width=W; sh.height=Hh; const x=sh.getContext('2d');
  x.fillStyle='#0b0e14'; x.fillRect(0,0,W,Hh);
  x.fillStyle='#ffd27a'; x.font='700 15px system-ui, sans-serif'; x.fillText(title,G,20);
  const peaks=[];
  for(let k=0;k<cols.length;k++){
    const xa=G+k*(C+G); x.fillStyle='#eef1f7'; x.font='600 12px system-ui, sans-serif'; x.fillText(cols[k].label,xa,T+14);
    const sc=psfScene(cols[k].params), [c,g]=H.surface(px); H.paintReal(g,sc,0); H.paintReal(g,sc,0.6);
    const d=H.pixels(g); let mx=0, sum=0; for(let i=0;i<d.length;i+=4){ const v=d[i]; if(v>mx) mx=v; sum+=v; }
    peaks.push(cols[k].label+': peak '+mx+' mean '+(sum/(d.length/4)).toFixed(2));
    x.drawImage(c,xa,T+L,C,C); await yieldNow();
  }
  return {saved:await H.save(sh,name),peaks};
}

/* preview vs export: the same frame at px and at 1080, the 1080 one drawn down to px; mean difference */
async function scaleCheck(params,photo,px){
  const a=renderCell(params,photo,0.6,px), b=renderCell(params,photo,0.6,1080);
  const [c2,g2]=H.surface(px); g2.imageSmoothingQuality='high'; g2.drawImage(b.c,0,0,px,px);
  return {params:JSON.stringify(params),px,meanDiff:H.diff(H.pixels(a.g),H.pixels(g2)).mean};
}

async function psfOne(params,name,px){ px=px||1080; const sc=psfScene(params), [c,g]=H.surface(px); H.paintReal(g,sc,0); H.paintReal(g,sc,0.6); return {saved:await H.save(c,name)}; }

/* __stack's own layout, but loading with onload (img.decode() can stall in a tab that is not in front) */
const loadIm=src=>new Promise((res,rej)=>{ const im=new Image(); const to=setTimeout(()=>rej(new Error('load timeout '+src)),20000); im.onload=()=>{ clearTimeout(to); res(im); }; im.onerror=()=>{ clearTimeout(to); rej(new Error('load failed '+src)); }; im.src=src; });
async function stack(names,labels,out){
  const ims=[]; for(const n of names) ims.push(await loadIm('shots/'+encodeURIComponent(n)+'.png?'+Date.now()));
  const L=28, G=10, W=Math.max(...ims.map(i=>i.width)), Hh=ims.reduce((s,i)=>s+i.height+L+G,G);
  const sh=document.createElement('canvas'); sh.width=W; sh.height=Hh; const x=sh.getContext('2d');
  x.fillStyle='#0b0e14'; x.fillRect(0,0,W,Hh);
  let y=G; ims.forEach((im,k)=>{ x.fillStyle='#ffd27a'; x.font='700 16px system-ui, sans-serif'; x.fillText((labels&&labels[k])||names[k],G,y+19); x.drawImage(im,0,y+L); y+=im.height+L+G; });
  return {saved:await H.save(sh,out),width:W,height:Hh};
}

window.__lb={renderCell,sheet,time,rack,one,card,psfSheet,scaleCheck,psfOne,stack,loadIm};
})();
