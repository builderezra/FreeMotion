/* probe-weather.js (round 5, slot 14): Snow & Rain (#1248) through the REAL renderer on a CARD layer over a dark frame, because the
   harness's own subject for a generator is a full-frame blank layer, where Inside the layer and Whole frame are the same picture.
   Load with truth.html?app=/app/&extra=probe-weather.js. Exposes window.__wx. Writes nothing but shots/<name>.png. */
(function(){
'use strict';
const H=window.__h;
let seq=0;
/* The tile's own layout (0..100 units of a 1080 square frame), so ours and the real render can be laid side by side. */
const LAY={ bg:'#000000', card:[7,13,86,66], key:'tesla', crop:[18,76,284,218] };
/* tesla's plate, in the 320 px source, painted out exactly as the tiles do */
const PLATE=[236,190,24,17,'#b9cdd3'];
function cardCanvas(L,cw,ch){
  const c=document.createElement('canvas'); c.width=cw; c.height=ch; const g=c.getContext('2d'); g.imageSmoothingQuality='high';
  const im=FXK.photo(L.key); const [sx,sy,sw,sh]=L.crop;
  g.drawImage(im,sx,sy,sw,sh,0,0,cw,ch);
  if(L.key==='tesla'){ const k=cw/sw, q=ch/sh; g.fillStyle=PLATE[4]; g.fillRect((PLATE[0]-sx)*k,(PLATE[1]-sy)*q,PLATE[2]*k,PLATE[3]*q); }
  return c;
}
function build(params,o){
  o=o||{}; const L=Object.assign({},LAY,o.lay||{}), P=1080, U=P/100, D=Math.max(8,(o.maxT||0)+1.5), tag='_wx'+(++seq)+'_';
  const [x,y,w,h]=L.card, cw=Math.round(w*U), ch=Math.round(h*U);
  const el=cardCanvas(L,cw,ch);
  FM.media.set(tag+'c',{kind:'image',el,width:cw,height:ch,duration:0}); FM.media.pin(tag+'c');
  const card=FM.makeLayer('image',{x:(x+w/2)*U,y:(y+h/2)*U,start:0,duration:D}); card.id=tag+'c';
  const reg=FM.fxRegistry.get('weather'), known=new Set(reg.params.map(p=>p.key)), warn=[];
  const inst=FM.fxRegistry.makeInstance('weather');
  for(const k of Object.keys(params||{})){ if(!known.has(k)){ warn.push('"'+k+'" is not a weather param'); continue; } inst.params[k]=params[k]; }
  card.effects=[inst];
  const project={width:P,height:P,fps:30,duration:D,background:L.bg};
  const scene={project,layers:[card]};
  const plain={project,layers:[Object.assign({},card,{effects:[]})]};
  return {scene,plain,warn,L,inst};
}
/* mean change (0..255 per channel) inside and outside the card, and the share of pixels moved by more than 16 */
function regionDiff(a,b,px,L){
  const [x,y,w,h]=L.card, x0=Math.round(x*px/100), y0=Math.round(y*px/100), x1=Math.round((x+w)*px/100), y1=Math.round((y+h)*px/100);
  let si=0,ni=0,hi=0,so=0,no=0,ho=0;
  for(let j=0;j<px;j++) for(let i=0;i<px;i++){
    const k=(j*px+i)*4, d=Math.abs(a[k]-b[k])+Math.abs(a[k+1]-b[k+1])+Math.abs(a[k+2]-b[k+2]);
    const inC=i>=x0+1&&i<x1-1&&j>=y0+1&&j<y1-1, outC=i<x0-1||i>=x1+1||j<y0-1||j>=y1+1;
    if(inC){ si+=d; ni+=3; if(d>16) hi++; } else if(outC){ so+=d; no+=3; if(d>16) ho++; }
  }
  const r=v=>Math.round(v*100)/100;
  return {inside:r(ni?si/ni:0), insideShare:r(ni?100*hi/(ni/3):0), outside:r(no?so/no:0), outsideShare:r(no?100*ho/(no/3):0)};
}
/* rows: [{label, params}] -> one row per set, one 180 px cell per t, from a 360 px render */
async function shot(rows,ts,name,o){
  o=o||{}; ts=(ts&&ts.length)?ts:[0.6,1.4,2.4];
  const px=360, C=180, G=10, Lh=24, maxT=Math.max(...ts);
  const Wd=Math.max(G+ts.length*(C+G),520), Ht=G+rows.length*(Lh+C+G);
  const sh=document.createElement('canvas'); sh.width=Wd; sh.height=Ht; const x=sh.getContext('2d');
  x.fillStyle='#0b0e14'; x.fillRect(0,0,Wd,Ht); x.imageSmoothingQuality='high';
  const [work,wg]=H.surface(px), errors=[], numbers=[];
  for(let r=0;r<rows.length;r++){
    const row=rows[r], y0=G+r*(Lh+C+G); let sc=null, plainPx=null;
    try{ sc=build(row.params,{maxT,lay:o.lay}); sc.warn.forEach(w=>errors.push(w)); H.paintReal(wg,sc.plain,0); plainPx=H.pixels(wg).slice(); H.paintReal(wg,sc.scene,0); }catch(e){ errors.push(e.message); }
    x.fillStyle='#eef1f7'; x.font='600 13px system-ui, sans-serif'; x.fillText(row.label||JSON.stringify(row.params),G,y0+16);
    const rn=[];
    for(let k=0;k<ts.length;k++){
      const xa=G+k*(C+G), y=y0+Lh, t=ts[k];
      if(sc){ try{ H.paintReal(wg,sc.scene,t); x.drawImage(work,xa,y,C,C); rn.push(regionDiff(H.pixels(wg),plainPx,px,sc.L)); }catch(e){ errors.push(t+': '+e.message); H.badCell(x,xa,y,C,e.message); } }
      else H.badCell(x,xa,y,C,'no render');
      H.caption(x,'t='+t,xa+3,y+C-3);
    }
    numbers.push({label:row.label,params:row.params,change:rn});
    await H.yieldNow();
  }
  return {saved:await H.save(sh,name||'r5-weather-shot'),errors,numbers};
}
/* OURS (the 'weather' tile) beside REAL at each cell {t, params}; change numbers inside/outside the card for both.
   ours' plain = the tile at plainT (its source beat, where no weather is on). */
async function truth(cells,name,o){
  o=o||{};
  const T=(window.FX_TILES||[]).filter(q=>q.id==='weather').pop();
  if(!T) return {error:'no weather tile'};
  const px=360, C=180, P2=4, GG=16, M=10, Lh=24;
  const Wd=M*2+cells.length*(C*2+P2)+(cells.length-1)*GG, Ht=M+Lh+C+M+18;
  const sh=document.createElement('canvas'); sh.width=Wd; sh.height=Ht; const x=sh.getContext('2d');
  x.fillStyle='#0b0e14'; x.fillRect(0,0,Wd,Ht); x.imageSmoothingQuality='high';
  const tileCv=document.createElement('canvas'); tileCv.width=tileCv.height=px; const tg=tileCv.getContext('2d',{willReadFrequently:true});
  const draw=T.make(px);
  draw(tg,o.plainT==null?0.2:o.plainT); const oursPlain=tg.getImageData(0,0,px,px).data.slice();
  const [work,wg]=H.surface(px), rows=[], errors=[];
  x.fillStyle='#eef1f7'; x.font='600 14px system-ui, sans-serif'; x.fillText('Snow & Rain (weather): OURS beside REAL ('+H.base+' renderer) on the same card layer',M,M+16);
  for(let k=0;k<cells.length;k++){
    const cell=cells[k], t=cell.t, xa=M+k*(C*2+P2+GG), xb=xa+C+P2, y=M+Lh;
    draw(tg,t); x.drawImage(tileCv,xa,y,C,C); H.caption(x,'ours t='+t,xa+3,y+C-3);
    const ours=regionDiff(tg.getImageData(0,0,px,px).data,oursPlain,px,LAY);
    let real=null;
    try{ const sc=build(cell.params,{maxT:t,lay:o.lay}); sc.warn.forEach(w=>errors.push(w)); H.paintReal(wg,sc.plain,0); const pp=H.pixels(wg).slice(); H.paintReal(wg,sc.scene,0); H.paintReal(wg,sc.scene,t); x.drawImage(work,xb,y,C,C); real=regionDiff(H.pixels(wg),pp,px,sc.L); }
    catch(e){ errors.push(t+': '+e.message); H.badCell(x,xb,y,C,e.message); }
    H.caption(x,'REAL t='+t,xb+3,y+C-3);
    x.fillStyle='#9aa3b5'; x.font='11px ui-monospace, monospace';
    x.fillText('in '+ours.inside+'/'+(real?real.inside:'-')+'  out '+ours.outside+'/'+(real?real.outside:'-'),xa,y+C+14);
    rows.push({t,params:cell.params,ours,real});
    await H.yieldNow();
  }
  return {saved:await H.save(sh,name||'r5-weather-truth'),rows,errors};
}
/* ms per real frame, with the effect and without (median of n) */
async function time(params,n,o){
  n=n||12; const sc=build(params,{maxT:6,lay:(o||{}).lay}); const [c,g]=H.surface(o&&o.px||360);
  const med=a=>a.sort((p,q)=>p-q)[a.length>>1];
  const run=s=>{ const a=[]; for(let i=0;i<n;i++){ const t0=performance.now(); H.paintReal(g,s,0.5+i*0.13); a.push(performance.now()-t0); } return Math.round(med(a)*100)/100; };
  run(sc.scene); return {withEffect:run(sc.scene),plain:run(sc.plain),px:c.width};
}
/* one real frame's pixels, for spot checks: NaN/black frames, alpha outside the card */
async function probe(params,t,o){
  const sc=build(params,{maxT:t,lay:(o||{}).lay}); const [c,g]=H.surface(360);
  H.paintReal(g,sc.scene,0); H.paintReal(g,sc.scene,t); const a=H.pixels(g).slice();
  H.paintReal(g,sc.plain,t); const b=H.pixels(g);
  let black=0; for(let i=0;i<a.length;i+=4){ if(a[i]+a[i+1]+a[i+2]===0) black++; }
  return Object.assign({blackShare:Math.round(10000*black/(a.length/4))/100},regionDiff(a,b,360,sc.L));
}
window.__wx={LAY,build,shot,truth,time,probe,regionDiff};
})();
