/* probe-blinds.js (round 5, Venetian Blinds): rows of REAL Blinds renders on one photo layer, alone or over a second photo,
   and our tile beside the real kernel at the tile's own Progress for every t. Loaded by truth.html?extra=probe-blinds.js. */
(function(){
'use strict';
const H=window.__h;
const lab=(x,s,px,py,col)=>{ x.font='600 13px system-ui, sans-serif'; x.fillStyle=col||'#eef1f7'; x.fillText(s,px,py); };

/* one scene: the photo as one full-frame layer, alone (holes show the project background) or over a second photo */
function scene(params,photo,alone,maxT,span){
  const sc=H.buildScene('blinds',{params,photo,sweep:true,maxT,span});
  if(alone){ const hero=sc.scene.layers[0]; sc.scene.layers=[hero]; sc.plain.layers=[sc.plain.layers[0]]; sc.on=photo+' alone'; }
  return sc;
}

/* rows: [{params, photo, alone, label}], ts: seconds. Progress sweeps 0..1 over span unless a row names it. */
window.__blindsRows=async function(rows,ts,name,o){
  await window.__truthReady; o=o||{};
  const px=360, C=o.cell||180, G=10, L=24, maxT=Math.max(...ts), span=o.span||Math.max(1,maxT+.2);
  const W=G+ts.length*(C+G), Ht=G+rows.length*(L+C+G);
  const sh=document.createElement('canvas'); sh.width=Math.max(W,560); sh.height=Ht; const x=sh.getContext('2d');
  x.fillStyle='#0b0e14'; x.fillRect(0,0,sh.width,Ht); x.imageSmoothingQuality='high';
  const [work,wg]=H.surface(px), errors=[], ms=[];
  for(let r=0;r<rows.length;r++){
    const R=rows[r], y0=G+r*(L+C+G);
    let sc=null; try{ sc=scene(R.params||{},R.photo,!!R.alone,maxT,span); sc.warn.forEach(w=>errors.push(w)); H.paintReal(wg,sc.scene,0); }catch(e){ errors.push(e.message); }
    lab(x,R.label||JSON.stringify(R.params||{}),G,y0+17);
    for(let k=0;k<ts.length;k++){
      const xa=G+k*(C+G), y=y0+L, t=ts[k];
      if(sc){ try{ const t0=performance.now(); H.paintReal(wg,sc.scene,t); ms.push(performance.now()-t0); x.drawImage(work,xa,y,C,C); }catch(e){ errors.push(t+': '+e.message); H.badCell(x,xa,y,C,e.message); } }
      const pr=(R.params&&R.params.progress!=null)?R.params.progress:Math.min(1,t/span);
      H.caption(x,'Progress '+pr.toFixed(2),xa+3,y+C-3);
    }
    await H.yieldNow();
  }
  const saved=await H.save(sh,name);
  return {saved,errors,msPerFrame:ms.length?Math.round(10*ms.reduce((a,b)=>a+b,0)/ms.length)/10:null,base:H.base};
};

/* our tile beside the real kernel at the tile's own Progress, for every t: OURS | REAL, with the change from each one's plain photo */
window.__blindsTruth=async function(ts,name,params){
  await window.__truthReady;
  const T=(window.FX_TILES||[]).filter(t=>t.id==='blinds').pop();
  const px=360, C=180, G=10, L=24, P2=4, GG=16;
  const draw=T.make(px), [tc,tg]=H.surface(px), [work,wg]=H.surface(px);
  if(!draw.progressAt) throw new Error('the tile does not expose progressAt');
  /* plain: ours at a moment the tile shows no blind, the real layer with no effect */
  let tPlain=null; for(let t=0;t<6;t+=.05){ if(draw.progressAt(t)>=1){ tPlain=t; break; } }
  draw(tg,tPlain); const oursPlain=H.pixels(tg).slice();
  const base=Object.assign({look:1},params||{});
  const sc0=scene(Object.assign({},base,{progress:1}),'huracan',true,1,1); H.paintReal(wg,sc0.plain,0); const realPlain=H.pixels(wg).slice();
  const W=G*2+ts.length*(C*2+P2)+(ts.length-1)*GG, Ht=G+L+C+G+64;
  const sh=document.createElement('canvas'); sh.width=W; sh.height=Ht; const x=sh.getContext('2d');
  x.fillStyle='#0b0e14'; x.fillRect(0,0,W,Ht); x.imageSmoothingQuality='high';
  lab(x,'Venetian Blinds: OURS (tile) | REAL (effects branch kernel), '+JSON.stringify(base)+' with the tile’s own Progress at each t, on huracan',G,G+14);
  const rows=[];
  for(let k=0;k<ts.length;k++){
    const t=ts[k], p=draw.progressAt(t), xa=G+k*(C*2+P2+GG), xb=xa+C+P2, y=G+L;
    draw(tg,t); const ours=H.pixels(tg).slice(); x.drawImage(tc,xa,y,C,C);
    const sc=scene(Object.assign({},base,{progress:p}),'huracan',true,t,1);
    H.paintReal(wg,sc.scene,0); H.paintReal(wg,sc.scene,t); const real=H.pixels(wg).slice(); x.drawImage(work,xb,y,C,C);
    const dO=H.diff(ours,oursPlain), dR=H.diff(real,realPlain), dX=H.diff(ours,real);
    rows.push({t,progress:Math.round(p*1000)/1000,oursChange:dO.mean,realChange:dR.mean,oursVsReal:dX.mean,share:Math.round(dX.share*1000)/1000});
    H.caption(x,'ours t='+t,xa+3,y+C-3); H.caption(x,'REAL p='+p.toFixed(2),xb+3,y+C-3);
    x.font='11px ui-monospace, monospace'; x.fillStyle='#ffd27a';
    x.fillText('change ours '+dO.mean.toFixed(1)+'  real '+dR.mean.toFixed(1),xa,y+C+16);
    x.fillText('ours vs real '+dX.mean.toFixed(1)+' (share>16: '+(dX.share*100).toFixed(1)+'%)',xa,y+C+32);
  }
  const saved=await H.save(sh,name);
  return {saved,rows,base:H.base};
};

/* the real kernel's cost on a 1080 frame: ms per paint, averaged */
window.__blindsTime=async function(params,n){
  await window.__truthReady; n=n||10;
  const sc=scene(params,'huracan',true,1,1), [c,g]=H.surface(1080);
  H.paintReal(g,sc.scene,0); const t0=performance.now(); for(let i=0;i<n;i++) H.paintReal(g,sc.scene,.5+i*.01); const withFx=(performance.now()-t0)/n;
  const t1=performance.now(); for(let i=0;i<n;i++) H.paintReal(g,sc.plain,.5+i*.01); const plain=(performance.now()-t1)/n;
  return {withFx:Math.round(withFx*10)/10,plain:Math.round(plain*10)/10,base:H.base};
};
})();
