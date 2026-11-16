/* Lens Flare probe (#1243 FX1 round 5, slot 7). Loaded by truth.html with &extra=probe-lensflare.js. Reads only. */
(function(){
'use strict';
const H=window.__h;
/* ms per frame of the real effect at a real export size: the scene with the effect, minus the same scene without it. */
window.__lfTime=async function(params,photoKey,reps,px){
  reps=reps||5; px=px||1080;
  const sc=H.buildScene('lensflare',{params:params||{},photo:photoKey||'ramp',sweep:false,maxT:2,project:1080});
  const [c,g]=H.surface(px);
  H.paintReal(g,sc.scene,0); H.paintReal(g,sc.plain,0);
  let t0=performance.now(); for(let i=0;i<reps;i++) H.paintReal(g,sc.scene,0.5+i*0.013); const fx=(performance.now()-t0)/reps;
  t0=performance.now(); for(let i=0;i<reps;i++) H.paintReal(g,sc.plain,0.5+i*0.013); const plain=(performance.now()-t0)/reps;
  const d=H.pixels(g); let s=0; for(let i=0;i<d.length;i+=4) s+=d[i]+d[i+1]+d[i+2];
  return {fx:+fx.toFixed(1),plain:+plain.toFixed(1),effect:+(fx-plain).toFixed(1),warn:sc.warn,base:H.base};
};
/* One real frame's pixels as a summary: mean level, how many pixels are pure black, and the change from the plain layer. */
window.__lfStats=async function(params,photoKey,t,px){
  px=px||360; t=t||1;
  const sc=H.buildScene('lensflare',{params:params||{},photo:photoKey||'ramp',sweep:false,maxT:t+1,project:1080});
  const [c,g]=H.surface(px);
  H.paintReal(g,sc.plain,t); const a=H.pixels(g).slice();
  H.paintReal(g,sc.scene,0); H.paintReal(g,sc.scene,t); const b=H.pixels(g);
  let s=0, black=0; for(let i=0;i<b.length;i+=4){ s+=b[i]+b[i+1]+b[i+2]; if(b[i]+b[i+1]+b[i+2]===0) black++; }
  return {mean:+(s/(b.length/4)/3).toFixed(2),black,change:H.diff(b,a),warn:sc.warn};
};
/* Real frames in a row of cells, each with its own params and caption: [{p:{...},photo,t,cap}], saved as one sheet. */
window.__lfRow=async function(cells,name,cell){
  cell=cell||240; const G=8, L=20, W=G+cells.length*(cell+G), Hh=G+L+cell+G;
  const sh=document.createElement('canvas'); sh.width=W; sh.height=Hh; const x=sh.getContext('2d');
  x.fillStyle='#0b0e14'; x.fillRect(0,0,W,Hh); x.imageSmoothingQuality='high';
  const [work,wg]=H.surface(360), errors=[];
  for(let k=0;k<cells.length;k++){ const C=cells[k], x0=G+k*(cell+G);
    try{ const sc=H.buildScene('lensflare',{params:C.p||{},photo:C.photo||'ramp',sweep:false,maxT:(C.t||1)+1,project:1080}); sc.warn.forEach(w=>errors.push(w));
      H.paintReal(wg,sc.scene,0); H.paintReal(wg,sc.scene,C.t||1); x.drawImage(work,x0,G+L,cell,cell); }
    catch(e){ errors.push(e.message); H.badCell(x,x0,G+L,cell,e.message); }
    x.fillStyle='#eef1f7'; x.font='600 12px system-ui, sans-serif'; x.fillText(C.cap||'',x0,G+14);
    await H.yieldNow(); }
  return {saved:await H.save(sh,name),errors};
};
})();
