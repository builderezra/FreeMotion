/* probe-blinds2.js (round 5, Venetian Blinds): layout prototypes of the menu picture, drawn with the kernel's own slat maths,
   side by side at 180 px and at the real 77 px. Loaded by truth.html?extra=probe-blinds.js,probe-blinds2.js. Nothing here is a tile. */
(function(){
'use strict';
const H=window.__h, {clamp,photoCover}=window.FXK;
const COAL='#0c0c0d', INK='#16130f', BONE='#e7e2d5', MONO='"Courier Prime","Courier New",Courier,monospace';
function tab(c,x,y,txt,bg,fg,size){ size=size||4.6; c.font='700 '+size+'px '+MONO; const w=c.measureText(txt).width+size*.9, h=size*1.45; c.fillStyle=bg; c.fillRect(x,y,w,h); c.fillStyle=fg; c.textBaseline='middle'; c.fillText(txt,x+size*.45,y+h*.54); c.textBaseline='alphabetic'; return w; }
/* the kernel's closed strips over a box (Angle 90, Side, Stagger 0, Softness 0): colour sc x (1 - shade (0.2 + 0.45 q + 0.35 across)) */
function slats(c,x,y,w,h,n,q,shade,sc){
  if(q>=1) return; q=clamp(q); const sw=h/n, a=1-shade*(.2+.45*q), b=a-shade*.35;
  const rgb=f=>'rgb('+(sc[0]*f).toFixed(2)+','+(sc[1]*f).toFixed(2)+','+(sc[2]*f).toFixed(2)+')';
  for(let k=0;k<n;k++){ const y0=y+k*sw, yc=y0+q*sw, y1=y0+sw; if(y1-yc<1e-3) continue; const g=c.createLinearGradient(0,y0,0,y1); g.addColorStop(0,rgb(a)); g.addColorStop(1,rgb(b)); c.fillStyle=g; c.fillRect(x,yc,w,y1-yc); }
}
const SC=[232,226,214];
/* a variant: (c,px,q) draws one frame at slat progress q */
function makeVariants(px){
  const full=photoCover('huracan',px)[0];
  const zoomed=(z,cx,cy)=>{ const C=document.createElement('canvas'); C.width=C.height=px; const x=C.getContext('2d'); const im=FXK.photo('huracan'); const s=px/Math.min(im.naturalWidth,im.naturalHeight)*z, w=im.naturalWidth*s, h=im.naturalHeight*s; let ox=px/2-cx/100*w, oy=px/2-cy/100*h; ox=Math.min(0,Math.max(px-w,ox)); oy=Math.min(0,Math.max(px-h,oy)); x.drawImage(im,ox,oy,w,h); return C; };
  const front=zoomed(1.3,58,62);
  const set=(c)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; c.imageSmoothingEnabled=true; c.imageSmoothingQuality='high'; };
  return [
    ['full-bleed, 10 slats, Shading 45',(c,q)=>{ set(c); c.drawImage(full,0,0,100,100); slats(c,0,0,100,100,10,q,.45,SC); }],
    ['sheet on Coal, Fit Layer, tab',(c,q)=>{ set(c); c.fillStyle=COAL; c.fillRect(0,0,100,100); const X=7,Y=15,W=80; c.drawImage(full,X,Y,W,W); slats(c,X,Y,W,W,10,q,.45,SC); tab(c,X,Y-7.4,'CLIP 01',BONE,INK,4.8); }],
    ['sheet on Coal, car crop 1.3',(c,q)=>{ set(c); c.fillStyle=COAL; c.fillRect(0,0,100,100); const X=7,Y=15,W=80; c.drawImage(front,X,Y,W,W); slats(c,X,Y,W,W,10,q,.45,SC); tab(c,X,Y-7.4,'CLIP 01',BONE,INK,4.8); }],
    ['full-bleed car crop 1.3, 8 slats',(c,q)=>{ set(c); c.drawImage(front,0,0,100,100); slats(c,0,0,100,100,8,q,.45,SC); }],
    ['bleed right+bottom sheet, tab',(c,q)=>{ set(c); c.fillStyle=COAL; c.fillRect(0,0,100,100); const X=12,Y=14,W=94; c.drawImage(full,X,Y,W,W); slats(c,X,Y,W,W,10,q,.45,SC); tab(c,X,Y-7.4,'SLATS 10',BONE,INK,4.8); }],
    ['full-bleed + Ink tab SOLID SLATS',(c,q)=>{ set(c); c.drawImage(full,0,0,100,100); slats(c,0,0,100,100,10,q,.45,SC); tab(c,3,91.5,'SOLID SLATS',INK,BONE,4.4); }],
    ['full-bleed + Ink tab LOOK SOLID top',(c,q)=>{ set(c); c.drawImage(full,0,0,100,100); slats(c,0,0,100,100,10,q,.45,SC); tab(c,3,2.5,'LOOK: SOLID',INK,BONE,4.4); }],
  ];
}
window.__blindsVariants=async function(qs,name){
  await window.__truthReady;
  const px=360, C=150, S=77, G=10, L=20, V=makeVariants(px);
  const W=G+qs.length*(C+G)+S+G, Ht=G+V.length*(L+C+G);
  const sh=document.createElement('canvas'); sh.width=W; sh.height=Ht; const x=sh.getContext('2d'); x.fillStyle='#0b0e14'; x.fillRect(0,0,W,Ht); x.imageSmoothingQuality='high';
  const [cv,g]=H.surface(px);
  V.forEach(([lab,f],r)=>{ const y0=G+r*(L+C+G); x.fillStyle='#eef1f7'; x.font='600 12px system-ui'; x.fillText(lab,G,y0+14);
    qs.forEach((q,k)=>{ f(g,q); g.setTransform(1,0,0,1,0,0); x.drawImage(cv,G+k*(C+G),y0+L,C,C); });
    f(g,qs[Math.min(1,qs.length-1)]); g.setTransform(1,0,0,1,0,0); x.drawImage(cv,G+qs.length*(C+G),y0+L,S,S); });
  return await H.save(sh,name);
};
})();
