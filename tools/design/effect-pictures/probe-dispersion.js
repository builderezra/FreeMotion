/* probe-dispersion.js: the Dispersion maker's own probe (round 5, tile id 'dispersion'). Loaded by truth.html with
   &extra=probe-dispersion.js. Renders the REAL kernel (whichever renderer the page booted: ?app=/app/ or ?app=/ss/) at exact
   Progress values, one row per param set, and times frames. Writes nothing but shots/ (through __h.save). */
(function(){
'use strict';
const H=window.__h;
/* rows: [{label, params}], progs: Progress per column; photo over back (full frame, 1080 project) */
async function rows(spec){
  const px=spec.px||360, C=spec.cell||180, G=10, L=24, list=spec.rows, progs=spec.progs;
  const W=G+progs.length*(C+G), Ht=G+list.length*(L+C+G);
  const sh=document.createElement('canvas'); sh.width=Math.max(W,560); sh.height=Ht; const x=sh.getContext('2d');
  x.fillStyle='#0b0e14'; x.fillRect(0,0,sh.width,Ht); x.imageSmoothingQuality='high';
  const [work,wg]=H.surface(px), errors=[], stats=[];
  for(let r=0;r<list.length;r++){
    const row=list[r], y0=G+r*(L+C+G), st=[];
    x.fillStyle='#eef1f7'; x.font='600 13px system-ui, sans-serif'; x.fillText(row.label,G,y0+16);
    for(let k=0;k<progs.length;k++){
      const pr=progs[k], xa=G+k*(C+G), y=y0+L;
      try{
        const sc=H.buildScene('dispersion',{params:Object.assign({},row.params||{},{progress:pr}),photo:row.photo||spec.photo,back:row.back||spec.back,maxT:0});
        sc.warn.forEach(w=>errors.push(w));
        H.paintReal(wg,sc.scene,0); const a=H.pixels(wg).slice();
        x.drawImage(work,xa,y,C,C);
        H.paintReal(wg,sc.plain,0); st.push(H.diff(a,H.pixels(wg)).mean);
      }catch(e){ errors.push(e.message); H.badCell(x,xa,y,C,e.message); st.push(null); }
      H.caption(x,'Progress '+pr,xa+3,y+C-3);
    }
    stats.push({label:row.label,change:st});
    await H.yieldNow();
  }
  return {saved:await H.save(sh,spec.name), errors, stats};
}
/* ms per real frame at px (the whole scene: back photo, the layer, the kernel), median of n */
function time(params,px,n,photo,back){
  px=px||1080; n=n||7;
  const [c,g]=H.surface(px), sc=H.buildScene('dispersion',{params,photo:photo||'figures',back:back||'shore',maxT:0});
  H.paintReal(g,sc.scene,0);
  const ms=[]; for(let i=0;i<n;i++){ const t0=performance.now(); H.paintReal(g,sc.scene,0); ms.push(performance.now()-t0); }
  ms.sort((a,b)=>a-b);
  const px0=H.pixels(g); let nan=0, black=0; for(let i=0;i<px0.length;i+=4){ if(px0[i]!==px0[i]) nan++; if(px0[i]+px0[i+1]+px0[i+2]===0) black++; }
  return {median:+ms[n>>1].toFixed(2), min:+ms[0].toFixed(2), black:black, nan:nan};
}
/* a layer SMALLER than the frame: 'figures' as a centred square of side `side` px in the 1080 project, over 'shore'.
   Returns the mean change of the frame from the same scene without the effect, at each Progress. */
function small(params,progs,side){
  side=side||540; const P=1080, D=4, out=[];
  const [c,g]=H.surface(360);
  for(const pr of progs){
    const tag='_dsm'+Math.random().toString(36).slice(2,7);
    const hero=H.imageLayer(tag+'h',H.photoEl('figures'),side,P/2,P/2,D), back=H.imageLayer(tag+'b',H.photoEl('shore'),P,P/2,P/2,D);
    const inst=FM.fxRegistry.makeInstance('dispersion'); Object.assign(inst.params,params||{},{progress:pr}); hero.effects=[inst];
    const scene={project:{width:P,height:P,fps:30,duration:D,background:'#151a24'},layers:[hero,back]};
    const plain={project:scene.project,layers:[Object.assign({},hero,{effects:[]}),back]};
    H.paintReal(g,scene,0); const a=H.pixels(g).slice(); H.paintReal(g,plain,0); out.push({progress:pr,change:H.diff(a,H.pixels(g)).mean});
  }
  return out;
}
/* the same small-layer scene as a sheet */
async function smallShot(rowsList,progs,side,name){
  side=side||540; const P=1080, D=4, C=180, G=10, L=24;
  const W=G+progs.length*(C+G), Ht=G+rowsList.length*(L+C+G);
  const sh=document.createElement('canvas'); sh.width=Math.max(W,560); sh.height=Ht; const x=sh.getContext('2d');
  x.fillStyle='#0b0e14'; x.fillRect(0,0,sh.width,Ht);
  const [c,g]=H.surface(360);
  for(let r=0;r<rowsList.length;r++){ const row=rowsList[r], y0=G+r*(L+C+G);
    x.fillStyle='#eef1f7'; x.font='600 13px system-ui, sans-serif'; x.fillText(row.label,G,y0+16);
    for(let k=0;k<progs.length;k++){ const pr=progs[k];
      const tag='_dss'+Math.random().toString(36).slice(2,7);
      const hero=H.imageLayer(tag+'h',H.photoEl('figures'),side,P/2,P/2,D), back=H.imageLayer(tag+'b',H.photoEl('shore'),P,P/2,P/2,D);
      const inst=FM.fxRegistry.makeInstance('dispersion'); Object.assign(inst.params,row.params||{},{progress:pr}); hero.effects=[inst];
      H.paintReal(g,{project:{width:P,height:P,fps:30,duration:D,background:'#151a24'},layers:[hero,back]},0);
      x.drawImage(c,G+k*(C+G),y0+L,C,C); H.caption(x,'Progress '+pr,G+k*(C+G)+3,y0+L+C-3); }
    await H.yieldNow(); }
  return {saved:await H.save(sh,name)};
}
window.__disp={rows,time,small,smallShot};
})();
