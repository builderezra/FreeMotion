/* probe-clouds.js: the Clouds maker's own probes (round 5, slot 12). Load with truth.html?app=/ss/&extra=probe-clouds.js (or /app/).
   Renders only: the real renderer on layers made here (a flat sky, a photograph, or the tile's own sky and ground layers);
   saves sheets through __h.save. Nothing here writes anywhere else. */
(function(){
'use strict';
const H=window.__h; if(!H){ console.error('probe-clouds: no __h'); return; }
let seq=0;
const plateOf=(paint,S)=>{ const c=document.createElement('canvas'); c.width=c.height=S||640; paint(c.getContext('2d'),c.width); return c; };
const flatCache={};
const flat=hex=>flatCache[hex]||(flatCache[hex]=plateOf((g,S)=>{ g.fillStyle=hex; g.fillRect(0,0,S,S); }));
const mine=()=>{ const L=(window.FX_TILES||[]).filter(T=>T.id==='clouds'); return L[L.length-1]; };
let hooks=null;
function tileHooks(){ if(hooks) return hooks; const T=mine(); if(!T) throw new Error('no clouds tile'); const d=T.make(360); if(!d.__real) throw new Error('tile has no __real hooks'); hooks=d.__real; hooks.draw=d; return hooks; }
let groundEl=null;
/* spec: 'sky:#rrggbb' | 'photo:<key>' | 'tile' (the tile's own layers: its ground above its sky) | 'blank' */
function layersFor(spec){
  if(spec==='tile'){ const h=tileHooks(); if(!groundEl) groundEl=plateOf((g,S)=>h.paintGround(g,S),1080); return [{el:groundEl,fx:false},{el:flat(h.sky),fx:true}]; }
  if(spec==='blank') return [{el:flat('#0b0e14'),fx:true}];
  const i=spec.indexOf(':'), a=spec.slice(0,i), b=spec.slice(i+1);
  if(a==='sky') return [{el:flat(b),fx:true}];
  if(a==='photo') return [{el:H.photoEl(b),fx:true}];
  throw new Error('bad spec '+spec);
}
/* FM layers: index 0 is the FRONT (as buildScene lists hero before backdrop) */
function scene(spec,params,P){
  P=P||1080; const C=P/2, D=4000, tag='_cl'+(++seq)+'_';   /* long enough for the long-time Boil and Drift checks */
  const L=layersFor(spec), layers=[]; let hero=null;
  L.forEach((sp,k)=>{ const l=H.imageLayer(tag+k,sp.el,P,C,C,D); if(sp.fx) hero=l; layers.push(l); });
  const reg=FM.fxRegistry.get('clouds'), known=new Set(reg.params.map(p=>p.key)), warn=[];
  const inst=FM.fxRegistry.makeInstance('clouds');
  for(const k of Object.keys(params||{})){ if(!known.has(k)){ warn.push('unknown param '+k+' (has: '+[...known].join(',')+')'); continue; } inst.params[k]=params[k]; }
  hero.effects=[inst];
  const sc={project:{width:P,height:P,fps:30,duration:D,background:'#151a24'},layers};
  const plain={project:sc.project,layers:layers.map(l=>l===hero?Object.assign({},l,{effects:[]}):l)};
  return {scene:sc,plain,inst,warn};
}
/* rows: [{label, spec, params}]; one row per entry, one 180 px cell per t, rendered at 360 */
async function shot(rows,ts,name,px){
  px=px||360; ts=(ts&&ts.length)?ts:[0.5,1.5,2.5];
  const C=180, G=10, L=24, W=Math.max(520,G+ts.length*(C+G)), Ht=G+rows.length*(L+C+G);
  const sh=document.createElement('canvas'); sh.width=W; sh.height=Ht; const x=sh.getContext('2d');
  x.fillStyle='#0b0e14'; x.fillRect(0,0,W,Ht); x.imageSmoothingQuality='high';
  const [work,wg]=H.surface(px), errors=[], change=[];
  for(let r=0;r<rows.length;r++){
    const row=rows[r], y0=G+r*(L+C+G); let sc=null;
    try{ sc=scene(row.spec,row.params); sc.warn.forEach(w=>errors.push(w)); H.paintReal(wg,sc.plain,0); }catch(e){ errors.push(e.message); }
    const plainPx=sc?H.pixels(wg).slice():null;
    x.fillStyle='#eef1f7'; x.font='600 13px system-ui, sans-serif'; x.fillText(row.label||(row.spec+' '+JSON.stringify(row.params||{})),G,y0+16);
    const ch=[];
    for(let k=0;k<ts.length;k++){
      const xa=G+k*(C+G), y=y0+L;
      if(sc){ try{ H.paintReal(wg,sc.scene,ts[k]); x.drawImage(work,xa,y,C,C); ch.push(H.diff(H.pixels(wg),plainPx).mean); }catch(e){ errors.push(ts[k]+': '+e.message); H.badCell(x,xa,y,C,e.message); } }
      H.caption(x,'t='+ts[k],xa+3,y+C-3);
    }
    change.push(ch);
    await H.yieldNow();
  }
  return {saved:await H.save(sh,name||'r5-clouds-probe'),errors,change};
}
/* ms per frame of the real renderer: canvas round(1080*rs) px, stamped as a reduced preview plate when rs < 1 */
async function time(spec,params,rs,n){
  n=n||6; rs=rs||1; const px=Math.round(1080*rs); const [cv,g]=H.surface(px); if(rs<1) cv.__fmRS=rs;
  const sc=scene(spec,params);
  H.paintReal(g,sc.scene,0.05); H.paintReal(g,sc.plain,0.05);
  let t0=performance.now(); for(let i=0;i<n;i++) H.paintReal(g,sc.plain,0.3+i*0.1); const plainMs=(performance.now()-t0)/n;
  t0=performance.now(); for(let i=0;i<n;i++) H.paintReal(g,sc.scene,0.3+i*0.1); const fxMs=(performance.now()-t0)/n;
  return {rs,px,fxMs:+fxMs.toFixed(1),plainMs:+plainMs.toFixed(1),effectMs:+(fxMs-plainMs).toFixed(1)};
}
/* Statistics of a real frame: share of pixels changed by more than 16, mean change, and whether any pixel is NaN-black */
async function stats(spec,params,t,px){
  px=px||360; const [cv,g]=H.surface(px); const sc=scene(spec,params);
  H.paintReal(g,sc.plain,t||0); const a=H.pixels(g).slice(); H.paintReal(g,sc.scene,t||0); const b=H.pixels(g);
  return H.diff(b,a);
}
/* OUR TILE beside THE REAL EFFECT on the tile's own layers (its flat sky layer under its ground layer), with the tile's own
   settings at each t (Cover as the tile has it then, Drift running since 0). change = mean difference from the plain layers;
   gap = mean difference between ours and real. */
async function truth(ts,name,px){
  px=px||360; const h=tileHooks(), T=mine(), draw=T.make(px);
  const C=180, P2=4, GG=16, M=10, L=40;
  const W=M*2+ts.length*(C*2+P2)+(ts.length-1)*GG, Ht=M+L+C+M+22;
  const sh=document.createElement('canvas'); sh.width=W; sh.height=Ht; const x=sh.getContext('2d');
  x.fillStyle='#0b0e14'; x.fillRect(0,0,W,Ht); x.imageSmoothingQuality='high';
  x.fillStyle='#eef1f7'; x.font='600 14px system-ui, sans-serif';
  x.fillText('Clouds (clouds): ours | REAL ['+(H.base==='/ss/'?'effects branch':'main')+'] on the tile\'s own sky and ground layers, the tile\'s settings at each t',M,M+14);
  const [oc,og]=H.surface(px), [rc,rg]=H.surface(px), rows=[];
  const sc0=scene('tile',h.paramsAt(0)); H.paintReal(rg,sc0.plain,0); const plainPx=H.pixels(rg).slice();
  for(let k=0;k<ts.length;k++){
    const t=ts[k], m=h.local(t), pr=h.paramsAt(t), xa=M+k*(C*2+P2+GG), xb=xa+C+P2, y=M+L;
    draw(og,t); const ours=H.pixels(og).slice(); x.drawImage(oc,xa,y,C,C);
    const sc=scene('tile',pr); H.paintReal(rg,sc.scene,0); H.paintReal(rg,sc.scene,m); const real=H.pixels(rg).slice(); x.drawImage(rc,xb,y,C,C);
    const co=H.diff(ours,plainPx).mean, cr=H.diff(real,plainPx).mean, gap=H.diff(ours,real);
    H.caption(x,'ours t='+t,xa+3,y+C-3); H.caption(x,'REAL t='+t,xb+3,y+C-3);
    x.fillStyle='#9aa3b5'; x.font='12px ui-monospace, monospace'; x.fillText('cover '+pr.cover+'%  change ours '+co+' real '+cr+'  gap '+gap.mean,xa,y+C+16);
    rows.push({t,m:+m.toFixed(3),params:pr,changeOurs:co,changeReal:cr,gap:gap.mean,gapShare:+gap.share.toFixed(4)});
    await H.yieldNow();
  }
  return {saved:await H.save(sh,name||'r5-clouds-truth'),rows};
}
window.__cl={scene,shot,time,stats,truth,tileHooks,flat};
})();
