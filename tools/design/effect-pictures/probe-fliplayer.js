/* probe-fliplayer.js: Card Flip (#1246 U10) in a REAL two-layer scene. The hero layer carries the Card Flip; Back: Another layer
   names a second layer of the same size in the same place, eye off, which is how the builder's note says to use it. Loaded into
   truth.html with &extra=probe-fliplayer.js. Writes nothing but shots/. */
(function(){
'use strict';
const H=window.__h; if(!H) return;
let seq=0;
const tile=()=>{ const all=(window.FX_TILES||[]).filter(T=>T.id==='fliplayer'); return all[all.length-1]; };
function imgLayer(id,el,w,h,x,y,D){ FM.media.set(id,{kind:'image',el,width:w,height:h,duration:0}); FM.media.pin(id); const l=FM.makeLayer('image',{x,y,start:0,duration:D}); l.id=id; return l; }
const cover=(k,W,Hh)=>{ const im=FXK.photo(k), C=document.createElement('canvas'); C.width=W; C.height=Hh; const g=C.getContext('2d'); g.imageSmoothingQuality='high'; const s=Math.max(W/im.naturalWidth,Hh/im.naturalHeight), w=im.naturalWidth*s, h=im.naturalHeight*s; g.drawImage(im,(W-w)/2,(Hh-h)/2,w,h); return C; };

/* o: {front, back: canvas | photo key | null, params, hideBack (default true), link (default true), bg, P (1080), geo (tile units)} */
function scene(o){
  o=o||{};
  const T=tile(), P=o.P||1080, D=o.D||8, tag='_fl'+(++seq)+'_';
  const g=o.geo||T.art(8).geo, w=Math.round(g.CW/100*P), h=Math.round(g.CH/100*P), x=g.CX/100*P, y=g.CY/100*P;
  const A=T.art(w);
  const el=v=>v==='front'?A.front:v==='title'?A.back:(typeof v==='string'?cover(v,w,h):v);
  const front=imgLayer(tag+'f',el(o.front||'front'),w,h,x,y,D);
  const layers=[front];
  let other=null;
  if(o.back){ other=imgLayer(tag+'o',el(o.back),w,h,x,y,D); other.name='CLIP 02'; if(o.hideBack!==false) other.visible=false; layers.push(other); }
  const inst=FM.fxRegistry.makeInstance('fliplayer');
  Object.assign(inst.params,o.params||{});
  if(other&&o.link!==false) inst.params.source=other.id;
  front.effects=o.noFx?[]:[inst];
  return {scene:{project:{width:P,height:P,fps:30,duration:D,background:o.bg||'#16130f'},layers},front,other,inst,art:A,geo:g};
}
function render(sc,t,px){ const [c,g]=H.surface(px||360); H.paintReal(g,sc.scene,0); H.paintReal(g,sc.scene,t); return c; }
const label=(x,s,px,py,col)=>{ x.font='600 13px system-ui, sans-serif'; x.fillStyle=col||'#eef1f7'; x.fillText(s,px,py); };

/* rows: [{label, o (scene opts), angle: number | (t)=>deg}], one cell per t */
async function shot(rows,ts,name){
  const C=180, G=10, L=24, W=G+ts.length*(C+G), Hh=G+rows.length*(L+C+G);
  const sh=document.createElement('canvas'); sh.width=Math.max(W,560); sh.height=Hh; const x=sh.getContext('2d');
  x.fillStyle='#0b0e14'; x.fillRect(0,0,sh.width,Hh); x.imageSmoothingQuality='high';
  const errors=[], ms=[];
  for(let r=0;r<rows.length;r++){
    const row=rows[r], y0=G+r*(L+C+G);
    let sc=null; try{ sc=scene(row.o); }catch(e){ errors.push(row.label+': '+e.message); }
    label(x,row.label,G,y0+16);
    for(let k=0;k<ts.length;k++){
      const xa=G+k*(C+G), y=y0+L, t=ts[k];
      if(!sc){ H.badCell(x,xa,y,C,'no scene'); continue; }
      try{
        if(row.angle!=null) sc.inst.params.angle=typeof row.angle==='function'?row.angle(t):row.angle;
        const [c,g]=H.surface(360); H.paintReal(g,sc.scene,t); const t0=performance.now(); H.paintReal(g,sc.scene,t); ms.push(performance.now()-t0);
        x.drawImage(c,xa,y,C,C);
        const px=H.pixels(g); let bad=0; for(let i=0;i<px.length;i+=4) if(px[i]!==px[i]) bad++; if(bad) errors.push(row.label+'@'+t+': NaN pixels '+bad);
      }catch(e){ errors.push(row.label+'@'+t+': '+e.message); H.badCell(x,xa,y,C,e.message); }
      H.caption(x,'t='+t+(row.angle!=null?'  '+Math.round(typeof row.angle==='function'?row.angle(t):row.angle)+'°':''),xa+3,y+C-3);
    }
    await H.yieldNow();
  }
  return {saved:await H.save(sh,name),errors,msPerFrame:ms.length?+(ms.reduce((a,b)=>a+b,0)/ms.length).toFixed(2):null};
}

/* OURS beside REAL in the matching scene (the tile's own two layers, at the tile's own Flip for each t), with the change each makes
   from the layer at rest (Flip 0) and the straight difference between them. */
async function truth(ts,name){
  const T=tile(), C=180, P2=4, GG=16, M=10, L=24, px=360;
  const W=M*2+ts.length*(C*2+P2)+(ts.length-1)*GG, Hh=M+L+C+M+40;
  const sh=document.createElement('canvas'); sh.width=W; sh.height=Hh; const x=sh.getContext('2d');
  x.fillStyle='#0b0e14'; x.fillRect(0,0,W,Hh); x.imageSmoothingQuality='high';
  const sc=scene({front:'front',back:'title',params:{back:3,mode:0,persp:50}});
  const draw=T.make(px), [oc,og]=H.surface(px), [rc,rg]=H.surface(px);
  /* the rest state of each: our tile at Flip 0 (t=0), the real layer with no effect */
  draw(og,0); const ours0=H.pixels(og).slice();
  const plain=scene({front:'front',back:'title',noFx:true}); H.paintReal(rg,plain.scene,0); const real0=H.pixels(rg).slice();
  label(x,'Card Flip (fliplayer)   OURS vs REAL ['+(H.base==='/ss/'?'effects branch':'main')+']: Flips Horizontal, Perspective 50, Back: Another layer = CLIP 02 (title card, eye off), Flip = the tile\'s own keyframes',M,M+16);
  const rows=[];
  for(let k=0;k<ts.length;k++){
    const t=ts[k], deg=T.art(8).angleAt(t), xa=M+k*(C*2+P2+GG), xb=xa+C+P2, y=M+L;
    draw(og,t); x.drawImage(oc,xa,y,C,C); const op=H.pixels(og);
    sc.inst.params.angle=Math.round(deg*1000)/1000; H.paintReal(rg,sc.scene,t); H.paintReal(rg,sc.scene,t); x.drawImage(rc,xb,y,C,C); const rp=H.pixels(rg);
    const oCh=H.diff(op,ours0).mean, rCh=H.diff(rp,real0).mean, d=H.diff(op,rp);
    /* the same, over the card's band only (rows 13..91 % of the tile): the tab, the Flip readout and the Back layer line are ours alone */
    const band=a=>a.slice(Math.round(px*.13)*px*4,Math.round(px*.91)*px*4), dc=H.diff(band(op),band(rp));
    rows.push({t,deg:+deg.toFixed(1),oursChange:oCh,realChange:rCh,oursVsReal:d.mean,share:+d.share.toFixed(3),cardBandOursVsReal:dc.mean});
    H.caption(x,'ours t='+t,xa+3,y+C-3); H.caption(x,'REAL '+Math.round(deg)+'°',xb+3,y+C-3);
    x.font='11px ui-monospace, monospace'; x.fillStyle='#9aa3b5';
    x.fillText('change ours '+oCh+' / real '+rCh,xa,y+C+14); x.fillText('ours vs real '+d.mean+' (card band '+dc.mean+')',xa,y+C+28);
    await H.yieldNow();
  }
  return {saved:await H.save(sh,name),rows};
}

window.__flip={scene,render,shot,truth,tile,cover};
})();
