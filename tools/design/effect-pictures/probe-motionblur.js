/* probe-motionblur.js (round 5, tile 'motionblur'): full-frame scenes, A/B grids and renderer checks for Directional Blur.
   Loaded into truth.html with &extra=probe-motionblur.js. Reads only; saves PNGs to shots/ through __h.save. */
(function(){
'use strict';
const H=window.__h;
let n=0;
/* a full-frame layer (photo key, or a canvas) carrying Directional Blur with these params, on a P-pixel square project */
function fullScene(src,params,P,bg){
  P=P||1080; const D=6, tag='_mb'+(++n)+'_';
  const el=(typeof src==='string')?H.photoEl(src):src;
  const hero=H.imageLayer(tag+'h',el,P,P/2,P/2,D);
  const inst=FM.fxRegistry.makeInstance('motionblur'); Object.assign(inst.params,params||{});
  hero.effects=[inst];
  const scene={project:{width:P,height:P,fps:30,duration:D,background:bg||'#151a24'},layers:[hero]};
  const plain={project:scene.project,layers:[Object.assign({},hero,{effects:[]})]};
  return {scene,plain};
}
/* the app's own subject for this effect (a card on the backdrop), as truth.html builds it */
function cardScene(photo,params){ const s=H.buildScene('motionblur',{photo,params:params||{}}); return {scene:s.scene,plain:s.plain}; }
function sceneOf(col,params){ return col.form==='card'?cardScene(col.photo,params):fullScene(col.photo,params,col.project,col.bg); }

/* rows: [{label, params}], cols: [{label, photo, form:'card'|'full'}]. One cell per (row, col), rendered at 2x and drawn at `cell`. */
async function grid(rows,cols,name,cell,t){
  cell=cell||200; t=t||1; const px=cell*2, G=10, L=22, TOP=26;
  const W=G+cols.length*(cell+G), Ht=TOP+rows.length*(L+cell+G);
  const sh=document.createElement('canvas'); sh.width=W; sh.height=Ht; const x=sh.getContext('2d');
  x.fillStyle='#0b0e14'; x.fillRect(0,0,W,Ht); x.imageSmoothingQuality='high';
  x.fillStyle='#8b96a8'; x.font='600 12px system-ui, sans-serif';
  cols.forEach((c,k)=>x.fillText(c.label,G+k*(cell+G),17));
  const [work,wg]=H.surface(px), errors=[], change=[];
  for(let r=0;r<rows.length;r++){
    const y0=TOP+r*(L+cell+G);
    x.fillStyle='#eef1f7'; x.font='600 13px system-ui, sans-serif'; x.fillText(rows[r].label,G,y0+15);
    const ch=[];
    for(let k=0;k<cols.length;k++){
      const xa=G+k*(cell+G), y=y0+L;
      try{ const s=sceneOf(cols[k],rows[r].params); H.paintReal(wg,s.plain,t); const pl=H.pixels(wg).slice(); H.paintReal(wg,s.scene,0); H.paintReal(wg,s.scene,t); x.drawImage(work,xa,y,cell,cell); ch.push(H.diff(H.pixels(wg),pl).mean); }
      catch(e){ errors.push(rows[r].label+' / '+cols[k].label+': '+e.message); H.badCell(x,xa,y,cell,e.message); ch.push(null); }
    }
    change.push(ch);
    await H.yieldNow();
  }
  return {saved:await H.save(sh,name),errors,change,renderer:H.base};
}

/* ms per full-size frame (median of n) at these params on a full-frame photo */
async function time(params,P,nrep,photo){
  P=P||1080; nrep=nrep||9; const s=fullScene(photo||'mclaren',params,P), [c,g]=H.surface(P), ts=[];
  H.paintReal(g,s.scene,0);
  for(let i=0;i<nrep;i++){ const a=performance.now(); H.paintReal(g,s.scene,1+i*0.01); g.getImageData(0,0,1,1); ts.push(performance.now()-a); }
  ts.sort((a,b)=>a-b); return Math.round(ts[nrep>>1]*10)/10;
}

/* a canvas painted by fn(ctx, size) at 640 px, to stand in for a photograph */
function art(fn){ const c=document.createElement('canvas'); c.width=c.height=640; fn(c.getContext('2d'),640); return c; }

/* render a full-frame scene at px and hand back its pixels */
function render(src,params,px,bg){ px=px||540; const s=fullScene(src,params,1080,bg), [c,g]=H.surface(px); H.paintReal(g,s.scene,0); H.paintReal(g,s.scene,1); return {c,g,d:H.pixels(g)}; }

/* OUR TILE beside the REAL effect on the same kind of layer: his McLaren full frame, plate blanked as the tile blanks it, at the
   Distance the tile shows at each t (Angle 0, Both ways, Frame edges Repeat). The level schedule is copied from tiles-h5.js. */
const LV=[0,6,18,36,62,96,136,178,214,240];
const levelAt=t=>{ const P=4.4, u=((t%P)+P)%P, d=240*(FXK.E.inOut(FXK.seg(u,.55,1.05))-FXK.E.inOut(FXK.seg(u,3.3,3.8))); let k=0; while(k+1<LV.length&&LV[k+1]<=d+1e-6) k++; return LV[k]; };
function plateBlanked(n){ const [C,x]=FXK.photoCover('mclaren',n); x.fillStyle='#b4553a'; x.beginPath(); [[77.6,54.4],[92.9,51.4],[94,57.8],[78.9,61]].forEach((q,i)=>i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1])); x.closePath(); x.fill(); return C; }
/* mean change per channel between two px-square frames, leaving out the tab (x 66..97, y 80..97 units: it sits bottom right) */
function diffOutsideTab(a,b,px){ const u=px/100, x0=Math.floor(66*u), x1=Math.ceil(97*u), y0=Math.floor(80*u), y1=Math.ceil(97*u); let s=0,n=0;
  for(let y=0;y<px;y++) for(let x=0;x<px;x++){ if(x>=x0&&x<x1&&y>=y0&&y<y1) continue; const i=(y*px+x)*4; s+=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]); n+=3; }
  return Math.round(100*s/n)/100; }
async function truthFull(ts,name,px){
  px=px||360; const C=180, P2=4, GG=16, M=10, L=24;
  const T=(window.FX_TILES||[]).filter(t=>t.id==='motionblur').pop(); if(!T) throw new Error('no motionblur tile');
  const draw=T.make(px), [tc,tg]=H.surface(px), [wc,wg]=H.surface(px), src=plateBlanked(640);
  const W=M*2+ts.length*(C*2+P2)+(ts.length-1)*GG, Ht=M+L+C+M+18;
  const sh=document.createElement('canvas'); sh.width=W; sh.height=Ht; const x=sh.getContext('2d'); x.fillStyle='#0b0e14'; x.fillRect(0,0,W,Ht); x.imageSmoothingQuality='high';
  x.fillStyle='#eef1f7'; x.font='600 14px system-ui, sans-serif'; x.fillText('Directional Blur (motionblur): OURS beside the REAL effect ('+H.base+') on the same full-frame McLaren, Angle 0, Both ways, Frame edges Repeat',M,M+14);
  const pl=fullScene(src,{distance:0},1080,'#151a24'); H.paintReal(wg,pl.plain,1); const realPlain=H.pixels(wg).slice();
  draw(tg,0.3); const oursPlain=H.pixels(tg).slice();
  const rows=[];
  for(let k=0;k<ts.length;k++){
    const t=ts[k], D=levelAt(t), xa=M+k*(C*2+P2+GG), xb=xa+C+P2, y=M+L;
    draw(tg,t); const od=H.pixels(tg).slice(); x.drawImage(tc,xa,y,C,C);
    const s=fullScene(src,{distance:D,angle:0,side:0,edges:1},1080,'#151a24'); H.paintReal(wg,s.scene,0); H.paintReal(wg,s.scene,1); const rd=H.pixels(wg).slice(); x.drawImage(wc,xb,y,C,C);
    const oc=H.diff(od,oursPlain).mean, rc=H.diff(rd,realPlain).mean, vs=H.diff(od,rd).mean, vsOut=diffOutsideTab(od,rd,px);
    H.caption(x,'ours t='+t,xa+3,y+C-3); H.caption(x,'REAL '+D+' px',xb+3,y+C-3);
    x.fillStyle='#9aa3b5'; x.font='11px ui-monospace, monospace'; x.fillText('change ours '+oc+' / real '+rc+' | ours vs real '+vsOut+' off the tab',xa,y+C+14);
    rows.push({t,D,oursChange:oc,realChange:rc,oursVsReal:vs,oursVsRealOffTab:vsOut});
  }
  return {saved:await H.save(sh,name),rows};
}

/* truth.html's __stack, laid out the same, but reading the shots with fetch + createImageBitmap: Image.decode() never settles
   in a tab that is not fronted (the pane is shared), so __stack hangs there. */
async function stack(names,labels,out){
  const ims=[];
  for(const nm of names){ const b=await (await fetch('shots/'+encodeURIComponent(nm)+'.png?'+Date.now(),{cache:'no-store'})).blob(); ims.push(await createImageBitmap(b)); }
  const L=28, G=10, W=Math.max(...ims.map(i=>i.width)), Ht=ims.reduce((s,i)=>s+i.height+L+G,G);
  const sh=document.createElement('canvas'); sh.width=W; sh.height=Ht; const x=sh.getContext('2d');
  x.fillStyle='#0b0e14'; x.fillRect(0,0,W,Ht);
  let y=G; ims.forEach((im,k)=>{ x.fillStyle='#ffd27a'; x.font='700 16px system-ui, sans-serif'; x.fillText((labels&&labels[k])||names[k],G,y+19); x.drawImage(im,0,y+L); y+=im.height+L+G; });
  return {saved:await H.save(sh,out),width:W,height:Ht};
}

window.__mb={fullScene,cardScene,grid,time,art,render,truthFull,levelAt,plateBlanked,stack};
})();
