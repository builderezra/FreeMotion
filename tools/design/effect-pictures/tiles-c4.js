/* FreeMotion effect pictures, artist 4 (c4): seven Colouring tiles. No photographs: every subject is painted here, and every
   change on it is the effect's own maths from js/compositor.js, run on those painted pixels. Each tile's _src(px) hands the
   painted source to the truth check, so the real renderer can be run on exactly the same picture. */
(function(){ 'use strict';
const {TAU,clamp,lerp,seg,E,rng}=window.FXK;

const BONE='#e7e2d5', INK='#16130f', NAVY='#161c28', TEXT='#eef2f8', DIM='#8b96a8', VERM='#e4471d', YEL='#ffce4a', TEAL='#29d9bb';
const MONO=s=>'bold '+s+'px "Courier Prime","Courier New",monospace';
const SANS=s=>'800 '+s+'px "Helvetica Neue",Helvetica,Arial,"Segoe UI",system-ui,sans-serif';
const mod=(t,P)=>((t%P)+P)%P;
const reset=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; };
const raw=c=>{ c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; };
const sheet=(w,h)=>{ const C=document.createElement('canvas'); C.width=w; C.height=h===undefined?w:h; return [C,C.getContext('2d')]; };
const units=(x,px)=>x.setTransform(px/100,0,0,px/100,0,0);
const poly=(x,p)=>{ x.beginPath(); for(let i=0;i<p.length;i+=2){ if(i) x.lineTo(p[i],p[i+1]); else x.moveTo(p[i],p[i+1]); } x.closePath(); };
const lin=(x,x0,y0,x1,y1,st)=>{ const g=x.createLinearGradient(x0,y0,x1,y1); st.forEach(s=>g.addColorStop(s[0],s[1])); return g; };
const rad=(x,cx,cy,r0,r1,st)=>{ const g=x.createRadialGradient(cx,cy,r0,cx,cy,r1); st.forEach(s=>g.addColorStop(s[0],s[1])); return g; };
/* a little silver in the paint, so a painted plate behaves like a photographed one (a flat fill would hide what a pixel effect does) */
const grain=(d,seed,amp)=>{ const R=rng(seed); for(let i=0;i<d.length;i+=4){ const v=(R()+R()-1)*amp; d[i]+=v; d[i+1]+=v; d[i+2]+=v; } };
const tab=(c,x,y,txt,s,bg,fg)=>{ c.font=MONO(s); const w=c.measureText(txt).width; c.fillStyle=bg; c.fillRect(x,y,w+s*.9,s*1.5); c.fillStyle=fg; c.textBaseline='middle'; c.textAlign='left'; c.fillText(txt,x+s*.45,y+s*.8); return w+s*.9; };
const diamond=(c,x,y,r,f)=>{ c.fillStyle=f; c.beginPath(); c.moveTo(x,y-r); c.lineTo(x+r,y); c.lineTo(x,y+r); c.lineTo(x-r,y); c.closePath(); c.fill(); };
const hexRGB=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
/* the box blur the glow kernels use: one pass, edges clamped */
function boxBlur(a,tmp,W,H,r){ const dv=2*r+1;
  for(let y=0;y<H;y++){ const row=y*W; let s=0; for(let x=-r;x<=r;x++) s+=a[row+(x<0?0:x>=W?W-1:x)]; for(let x=0;x<W;x++){ tmp[row+x]=s/dv; s+=a[row+Math.min(W-1,x+r+1)]-a[row+Math.max(0,x-r)]; } }
  for(let x=0;x<W;x++){ let s=0; for(let y=-r;y<=r;y++) s+=tmp[(y<0?0:y>=H?H-1:y)*W+x]; for(let y=0;y<H;y++){ a[y*W+x]=s/dv; s+=tmp[Math.min(H-1,y+r+1)*W+x]-tmp[Math.max(0,y-r)*W+x]; } }
}
/* 2D value noise and its fractal sum; h2 an integer hash of a lattice cell */
const h2=(i,j,s)=>{ let n=(Math.imul(i,374761393)+Math.imul(j,668265263)+Math.imul(s,1442695041))|0; n=Math.imul(n^(n>>>13),1274126177); return ((n^(n>>>16))>>>0)/4294967296; };
function vn2(x,y,seed){ const xi=Math.floor(x), yi=Math.floor(y), xf=x-xi, yf=y-yi, u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf);
  const a=h2(xi,yi,seed), b=h2(xi+1,yi,seed), c=h2(xi,yi+1,seed), d=h2(xi+1,yi+1,seed); return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v; }

/* ---- the painted subjects ---------------------------------------------------------------------------------------------- */

/* a theatre dressing-room mirror, close on its top-left corner: big bulbs along the top and down the side, the glass running off
   the right edge, a rail of costumes reflected in it, the counter's edge at the foot */
function paintMirror(x){
  x.fillStyle=lin(x,0,0,0,100,[[0,'#261d18'],[1,'#120e0b']]); x.fillRect(0,0,100,100);
  x.fillStyle=rad(x,8,6,0,50,[[0,'rgba(150,104,62,.34)'],[1,'rgba(150,104,62,0)']]); x.fillRect(0,0,100,100);
  const MX=25, MY=25, MB=87;
  x.fillStyle='#4a3527'; x.fillRect(MX-2.4,MY-2.4,100,MB-MY+4.8);
  x.fillStyle=lin(x,MX,MY,100,MB,[[0,'#383a3e'],[.55,'#26282b'],[1,'#1a1b1d']]); x.fillRect(MX,MY,100-MX,MB-MY);
  /* in the glass, dim and well under the threshold: the opposite wall and a rail of costumes */
  x.fillStyle='rgba(150,140,128,.16)'; x.fillRect(MX,MY+15,100-MX,.9);
  [[30,11,'#5b2b2e'],[42,8,'#2f3a4c'],[51,12,'#4b4537'],[64,9,'#3a2f3d'],[74,11,'#4f3a2c'],[86,9,'#2b3a36']].forEach(q=>{ x.fillStyle=q[2]; poly(x,[q[0],MY+16, q[0]+q[1],MY+16, q[0]+q[1]+2,MY+50, q[0]-1.6,MY+50]); x.fill(); });
  x.fillStyle='rgba(255,255,255,.045)'; poly(x,[MX+36,MY, MX+52,MY, MX+26,MB, MX+10,MB]); x.fill();
  /* the bulbs: warm globes on dark sockets */
  const bulb=(cx,cy)=>{ x.fillStyle='#5b5047'; x.fillRect(cx-2.8,cy-2.8,5.6,5.6); x.fillStyle=rad(x,cx-1.3,cy-1.3,0,5.9,[[0,'#fffdf7'],[.5,'#fff2d6'],[1,'#e6c48a']]); x.beginPath(); x.arc(cx,cy,5.4,0,TAU); x.fill(); };
  for(let k=0;k<4;k++) bulb(37+k*17.5,MY-12.4);
  for(let k=0;k<4;k++) bulb(MX-12.4,MY+9+k*17.5);
  /* the counter's edge catching the bulbs, a jar of brushes on it */
  x.fillStyle='#2f2219'; x.fillRect(0,94,100,6); x.fillStyle='#8a694c'; x.fillRect(0,94,100,1);
  x.strokeStyle='#0d0907'; x.lineWidth=.9; x.lineCap='round'; x.beginPath(); x.moveTo(56,88); x.lineTo(53.5,76); x.moveTo(58.5,88); x.lineTo(59.2,74); x.moveTo(61,88); x.lineTo(64,77.5); x.stroke();
  x.fillStyle='rgba(170,180,186,.42)'; x.fillRect(54.6,85,8.6,9); x.fillStyle='rgba(230,236,240,.4)'; x.fillRect(55.1,85.4,.9,8.2);
}

/* a football match from the gantry, as one function of a point in 0..100 units, so a second camera is the same function a few
   units over: the stand under its roof, the boards, a striped pitch in perspective, the halfway line and centre circle, players */
const CROWD=[[176,36,40],[226,224,216],[34,44,74],[204,170,62],[80,98,128],[140,140,136],[24,24,26],[120,30,34]];
const PLAYERS=[[-38,150,0],[-14,172,1],[-2,138,0],[14,186,1],[30,160,0],[44,132,1],[58,176,0],[-26,126,1],[70,146,1]];
function pitchAt(X,Y){
  if(Y<4.5) return [22,23,27];
  if(Y<28.5){ const ry=(Y-4.5)/1.6, row=Math.floor(ry), off=(row&1)*.55, cx=(X+off)/1.1, col=Math.floor(cx), fy=ry-row, fx=cx-col, shade=.46+.54*(Y-4.5)/24, h=h2(col,row,3);
    let c; if(fx<.13||fy>.88) c=[18,18,20]; else if(h<.16) c=[44,42,46]; else if(fy<.38) c=h2(col,row,9)<.72?[198,152,120]:[92,66,50]; else c=CROWD[Math.floor(h2(col,row,5)*CROWD.length)];
    return c.map(v=>v*shade); }
  if(Y<30.6) return [16,16,20];
  if(Y<33.8) return Y<32.2?[40,92,184]:[26,62,136];
  const f=(Y-12)/88, z=100/f, u=(X-50)/f;
  for(const p of PLAYERS){ const fp=100/p[1], px=50+p[0]*fp, fy=12+88*fp, hh=5.2*fp, ww=1.7*fp;
    if(X>px-ww/2&&X<px+ww/2&&Y>fy-hh&&Y<fy){ const k=(fy-Y)/hh; return k>.8?[196,150,118]:k>.42?(p[2]?[232,232,226]:[200,36,42]):(p[2]?[30,36,70]:[22,22,24]); }
    const ex=(X-px-1.4*fp)/(1.8*fp), ey=(Y-fy)/(.55*fp); if(ex*ex+ey*ey<1) return [40,84,36]; }
  const W=[226,230,222];
  if(Y>34.4&&Y<35.2) return W;
  if(Math.abs(u-26)<.42/f) return W;
  const z0=100/((63-12)/88), d=Math.hypot(u-26,(z-z0)*.85); if(Math.abs(d-19)<.5/f) return W;
  const g=(Math.floor(u/10)&1)?[58,122,52]:[76,144,64], n=.9+.18*vn2(X*1.4,Y*3,51);
  return g.map(v=>v*n);
}

/* a beach from straight above at noon: sea and surf across the top left, dry sand, four parasols and their shadows, two towels */
function paintBeach(x){
  x.fillStyle=lin(x,0,0,100,100,[[0,'#dcbb82'],[1,'#c9a36b']]); x.fillRect(0,0,100,100);
  const shore=[]; for(let i=0;i<=26;i++){ const X=-5+i*4.6, Y=40-X*.42+3.4*Math.sin(X*.12)+1.5*Math.sin(X*.41+1); shore.push([X,Y]); }
  const fillAbove=(dy,style)=>{ x.fillStyle=style; x.beginPath(); x.moveTo(-6,-6); shore.forEach(p=>x.lineTo(p[0],p[1]+dy)); x.lineTo(120,-6); x.closePath(); x.fill(); };
  fillAbove(5,'#b9945f');
  fillAbove(0,lin(x,0,0,34,34,[[0,'#0f3a52'],[.65,'#1d6773'],[1,'#3b9496']]));
  x.strokeStyle='#ece8dc'; x.lineJoin='round'; x.lineWidth=1.8; x.beginPath(); shore.forEach((p,i)=>i?x.lineTo(p[0],p[1]-.6):x.moveTo(p[0],p[1]-.6)); x.stroke();
  x.lineWidth=.9; x.setLineDash([5,3.4,2,4]); x.beginPath(); shore.forEach((p,i)=>i?x.lineTo(p[0]-2.6,p[1]-4.2):x.moveTo(p[0]-2.6,p[1]-4.2)); x.stroke(); x.setLineDash([]);
  /* towels */
  const towel=(cx,cy,w,h,a,base,stripe)=>{ x.save(); x.translate(cx,cy); x.rotate(a); x.fillStyle='rgba(40,26,14,.5)'; x.fillRect(-w/2+.8,-h/2+.8,w,h); x.fillStyle=base; x.fillRect(-w/2,-h/2,w,h); x.fillStyle=stripe; for(let k=1;k<4;k++) x.fillRect(-w/2,-h/2+k*h/4-.6,w,1.2); x.restore(); };
  towel(45,70,6.5,12,.22,'#283a6e','#ece5d4'); towel(87,57,6,11,-.15,'#ece5d4','#d9502c');
  /* parasols: shadow first, then eight panels, then the dome's falloff */
  const parasol=(cx,cy,r,a,cA,cB)=>{ x.fillStyle='rgba(40,26,14,.74)'; x.beginPath(); x.ellipse(cx+5,cy+4,r,r*.96,0,0,TAU); x.fill();
    for(let k=0;k<8;k++){ x.fillStyle=k&1?cB:cA; x.beginPath(); x.moveTo(cx,cy); x.arc(cx,cy,r,a+k*TAU/8,a+(k+1)*TAU/8); x.closePath(); x.fill(); }
    x.fillStyle=rad(x,cx-r*.25,cy-r*.25,r*.1,r*1.1,[[0,'rgba(255,255,255,.12)'],[.6,'rgba(0,0,0,0)'],[1,'rgba(30,16,8,.3)']]); x.beginPath(); x.arc(cx,cy,r,0,TAU); x.fill();
    x.fillStyle='#3a2a1c'; x.beginPath(); x.arc(cx,cy,.8,0,TAU); x.fill(); };
  parasol(30,64,9.5,.2,'#d9502c','#efe8d8'); parasol(65,47,8.6,.5,'#283a6e','#efe8d8'); parasol(77,80,10.2,.05,'#d9502c','#efe8d8'); parasol(22,90,6.8,.4,'#d9502c','#d9502c');
}

/* an empty cinema from below the screen: six rows of red velvet seats rising away, an aisle with step lights on the right */
function paintSeats(x,W,H){
  x.fillStyle=lin(x,0,0,0,H,[[0,'#121012'],[1,'#241d1f']]); x.fillRect(0,0,W,H);
  const AX=W*.8;
  let yb=H+3;
  const rows=[];
  for(let r=0;r<7;r++){ const s=Math.pow(.83,r), hh=15*s, ww=11*s; rows.push({r,s,hh,ww,yb}); yb-=hh*.62; }
  for(let i=rows.length-1;i>=0;i--){ const {r,s,hh,ww,yb}=rows[i], top=yb-hh, off=(r&1)?ww*.5:0;
    /* the riser in front of this row */
    x.fillStyle='#19141a'; x.fillRect(0,yb-hh*.36,W,hh*.5);
    for(let sx=-ww+off; sx<AX-ww*.3; sx+=ww){ const x0=sx+ww*.08, w0=ww*.84;
      x.fillStyle=lin(x,0,top,0,yb,[[0,'#d33a42'],[.12,'#b8242d'],[.6,'#8a1820'],[1,'#4d0c12']]);
      x.beginPath(); x.roundRect(x0,top,w0,hh*.78,[w0*.32,w0*.32,w0*.08,w0*.08]); x.fill();
      x.fillStyle='rgba(255,170,170,.16)'; x.fillRect(x0+w0*.18,top+hh*.06,w0*.64,hh*.04);
      x.fillStyle='#120d10'; x.fillRect(sx-ww*.04,top+hh*.38,ww*.12,hh*.44); }
    /* the aisle: carpet steps and a step light at this row */
    x.fillStyle=r&1?'#2d2a33':'#26232b'; x.fillRect(AX,yb-hh*.7,W-AX,hh*.7);
    x.fillStyle='#f0b347'; x.fillRect(AX+.6,yb-hh*.34,1.6*s+.4,.9*s+.3); }
  x.fillStyle='rgba(0,0,0,.35)'; x.fillRect(AX-.5,0,.8,H);
}

/* a colonnade: a column as one outline (plinth, base, tapering shaft, echinus, abacus), h its height, base centre (bx, by) */
function columnPath(x,bx,by,h){ const w=h*.115;
  x.beginPath();
  x.rect(bx-w*1.6,by-h*.055,w*3.2,h*.055);
  x.rect(bx-w*1.32,by-h*.1,w*2.64,h*.05);
  x.moveTo(bx-w,by-h*.1); x.lineTo(bx-w*.82,by-h*.86); x.lineTo(bx+w*.82,by-h*.86); x.lineTo(bx+w,by-h*.1); x.closePath();
  x.moveTo(bx-w*.86,by-h*.86); x.lineTo(bx-w*1.45,by-h*.935); x.lineTo(bx+w*1.45,by-h*.935); x.lineTo(bx+w*.86,by-h*.86); x.closePath();
  x.rect(bx-w*1.6,by-h,w*3.2,h*.068);
}

const MINE=[

/* HIGHLIGHT BLOOM. Graded still. PIXEL_FX.lightglow on the painted dressing room: pixels over the Threshold (60 %, 153 of 255) keep
   their brightness, everything else is 0, one box blur of Radius 56 px on a 1080 frame (the slider runs 1-80), then screened in white
   at Amount 0.8. At the default Radius 6 the same glow is a hair's width and does not read at menu size. Screen at alpha a of that
   blur is the kernel's own 255-(255-d)(255-g)/255 with g = blur x a, so Amount travels exactly (checked against the real render). */
{ id:'lightglow', name:'Highlight Bloom', section:'Colouring', isNew:true, still:2.2,
  line:'The brightest parts of the picture glow, and the glow spills over the darker edges next to them.',
  _src(px){ const [S,x]=sheet(px); units(x,px); paintMirror(x); return S; },
  make(px){
    const P=4.2, R=56, AMT=.8, THR=153, n=px*px;
    const S=this._src(px), sx=S.getContext('2d'); sx.setTransform(1,0,0,1,0,0);
    const im=sx.getImageData(0,0,px,px), d=im.data; grain(d,41,4); sx.putImageData(im,0,0);
    const br=new Float32Array(n), tmp=new Float32Array(n);
    for(let i=0;i<n;i++){ const j=i*4, L=.299*d[j]+.587*d[j+1]+.114*d[j+2]; br[i]=L>THR?L:0; }
    boxBlur(br,tmp,px,px,Math.max(1,Math.round(R*px/1080)));
    const [G,gx]=sheet(px), gi=gx.createImageData(px,px), g=gi.data;
    for(let i=0;i<n;i++){ const j=i*4, v=Math.min(255,br[i]); g[j]=g[j+1]=g[j+2]=v; g[j+3]=255; }
    gx.putImageData(gi,0,0);
    return (c,t)=>{
      const u=mod(t,P), a=AMT*E.inOut(seg(u,.6,1.3))*(1-E.inOut(seg(u,3.4,3.9)));
      raw(c); c.drawImage(S,0,0);
      if(a>.003){ c.globalCompositeOperation='screen'; c.globalAlpha=a; c.drawImage(G,0,0); }
      reset(c,px);
    };
  } },

/* POSTER SHADOW. Type poster. PIXEL_FX.longshadow at Angle 45 (the default, the diagonal walk): every empty pixel that has the layer
   1 to Length pixels up and to the left of it takes the Shadow colour at full strength. Union of the layer shifted 0..Length along
   the diagonal, built by doubling. Length travels to 150 px of a 1080 frame (the slider runs to 400); Shadow colour vermilion.
   Pixel for pixel the real render at those settings. */
{ id:'longshadow', name:'Poster Shadow', section:'Colouring', isNew:true, still:2.0,
  line:'A hard, flat shadow is thrown off the layer at one angle, and Length sets how far it reaches.',
  _src(px){ const [M,x]=sheet(px); units(x,px); x.fillStyle=INK; x.font=SANS(55); x.textBaseline='alphabetic'; x.textAlign='left'; x.fillText('CA',-3,46); x.fillText('ST',-3,92); return M; },
  make(px){
    const P=3.6, LMAX=150, M=this._src(px), [A]=sheet(px), [B]=sheet(px);
    const shadow=Lp=>{
      const ax=A.getContext('2d'); raw(ax); ax.clearRect(0,0,px,px); ax.drawImage(M,0,0);
      let have=1, src=A, dst=B;
      const step=k=>{ const dc=dst.getContext('2d'); raw(dc); dc.clearRect(0,0,px,px); dc.drawImage(src,0,0); dc.drawImage(src,k,k); const s=src; src=dst; dst=s; };
      while(have*2<=Lp+1){ step(have); have*=2; }
      if(have<Lp+1) step(Lp+1-have);
      const sc=src.getContext('2d'); raw(sc); sc.globalCompositeOperation='source-in'; sc.fillStyle=VERM; sc.fillRect(0,0,px,px); sc.globalCompositeOperation='source-over';
      return src; };
    let lastL=-1, lastS=null;
    return (c,t)=>{
      const u=mod(t,P), f=Math.floor(u*12)/12;
      const L=f<.5?0:f<1.25?LMAX*E.out(seg(f,.5,1.25)):f<3.1?LMAX:0, Lp=Math.round(L*px/1080);
      reset(c,px); c.fillStyle=BONE; c.fillRect(0,0,100,100);
      raw(c);
      if(Lp>0){ if(Lp!==lastL){ lastS=shadow(Lp); lastL=Lp; } c.drawImage(lastS,0,0); }
      c.drawImage(M,0,0); reset(c,px);
    };
  } },

/* MATCH GRADE. Graded still. drawMatchGrade's transfer, per channel: out = refMean + (x - clipMean) x refSD/clipSD (gain held to
   0.25..4), measured on the whole of both frames. Two broadcast cameras on the same match, framed a few units apart; the reference
   is warm and contrasty, the clip cool, flat and lifted (through a gamma, so no straight line can undo it exactly). The transfer is
   linear in Amount, so the tile fades the full match in by Amount. Left: the reference. Right: the clip, matched. */
{ id:'matchgrade', name:'Match Grade', section:'Colouring', isNew:true, still:2.4,
  line:'One clip’s colour and contrast are pushed toward another clip’s, so two cameras look like one.',
  /* the two cameras' raw frames side by side: A at the left, B framed 4 units further along */
  _src(px){ const N=px, [Q,x]=sheet(2*N,N), o=x.createImageData(2*N,N), q=o.data, R=rng(7);
    for(let y=0;y<N;y++) for(let xx=0;xx<2*N;xx++){ const b=xx>=N, X=(b?xx-N:xx)*100/N+(b?4:0), Y=y*100/N, v=pitchAt(X,Y), j=(y*2*N+xx)*4, gr=(R()+R()-1)*5; q[j]=v[0]+gr; q[j+1]=v[1]+gr; q[j+2]=v[2]+gr; q[j+3]=255; }
    x.putImageData(o,0,0); return Q; },
  /* both cameras' graded frames (the reference, the clip) and the clip after the full match */
  _frames(N){
    const Q=this._src(N), qx=Q.getContext('2d'); qx.setTransform(1,0,0,1,0,0);
    const d=qx.getImageData(0,0,2*N,N).data;
    const A=new Float32Array(N*N*3), Bc=new Float32Array(N*N*3);
    /* camera A: warm, contrasty. Camera B: cool, flat and lifted, through a gamma */
    const camA=(r,g,b)=>{ const k=v=>clamp(((v/255-.46)*1.22+.46),0,1)*255; return [k(r)*1.06+12,k(g)*1.0+4,k(b)*.82-4]; };
    const camB=(r,g,b)=>{ const k=v=>34+.72*255*Math.pow(v/255,.85); return [k(r)*.9,k(g)*.97+6,k(b)*1.03+18]; };
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){ const i=(y*2*N+x)*4, j=(y*2*N+x+N)*4, o=(y*N+x)*3;
      const a=camA(d[i],d[i+1],d[i+2]), b=camB(d[j],d[j+1],d[j+2]); for(let k=0;k<3;k++){ A[o+k]=Math.round(clamp(a[k],0,255)); Bc[o+k]=Math.round(clamp(b[k],0,255)); } }
    const stats=v=>{ const s=[0,0,0], s2=[0,0,0], n=v.length/3; for(let i=0;i<v.length;i+=3) for(let k=0;k<3;k++){ s[k]+=v[i+k]; s2[k]+=v[i+k]*v[i+k]; }
      const m=s.map(q=>q/n); return {m, sd:s2.map((q,k)=>Math.sqrt(Math.max(0,q/n-m[k]*m[k])))}; };
    const SA=stats(A), SB=stats(Bc), gain=[0,1,2].map(k=>SB.sd[k]<1?1:clamp(SA.sd[k]/SB.sd[k],.25,4));
    const plate=(f)=>{ const [C,x]=sheet(N), o=x.createImageData(N,N), q=o.data; for(let i=0,j=0;i<N*N*3;i+=3,j+=4){ const v=f(i); q[j]=v[0]; q[j+1]=v[1]; q[j+2]=v[2]; q[j+3]=255; } x.putImageData(o,0,0); return C; };
    return {REF:plate(i=>[A[i],A[i+1],A[i+2]]), CLIP:plate(i=>[Bc[i],Bc[i+1],Bc[i+2]]), MATCH:plate(i=>[0,1,2].map(k=>SA.m[k]+(Bc[i+k]-SB.m[k])*gain[k]))};
  },
  make(px){
    const P=4.4, N=Math.min(px,240), {REF,CLIP,MATCH}=this._frames(N), h=N/2;
    return (c,t)=>{
      const u=mod(t,P), a=E.inOut(seg(u,.9,1.8))*(1-E.inOut(seg(u,3.6,4.1)));
      raw(c); c.imageSmoothingEnabled=true;
      c.drawImage(REF,0,0,h,N,0,0,px/2,px);
      c.drawImage(CLIP,h,0,h,N,px/2,0,px/2,px);
      if(a>.003){ c.globalAlpha=a; c.drawImage(MATCH,h,0,h,N,px/2,0,px/2,px); c.globalAlpha=1; }
      reset(c,px); c.fillStyle=BONE; c.fillRect(49.7,0,.6,100);
      tab(c,3,91.5,'REF',4.6,INK,BONE); tab(c,53,91.5,'CLIP',4.6,INK,a>.5?BONE:DIM);
    };
  } },

/* PALETTE MAP. Print. PIXEL_FX.palettemap exactly at its defaults: Palette: Your colours, Match by: Nearest colour, and its own four
   colours (#1d1b3a, #e4572e, #f3a712, #f5f1e3). Every pixel becomes the nearest of the first Colours entries by the kernel's weighted
   distance (.30, .59, .11). Colours steps 2, 3, 4 on hard cuts; the chips below are the four colour controls, lit in use. */
{ id:'palettemap', name:'Palette Map', section:'Colouring', isNew:true, still:2.6,
  line:'Every pixel snaps to the nearest of a few colours you choose, like a screen print.',
  _src(px){ const [S,x]=sheet(px); units(x,px); paintBeach(x); return S; },
  make(px){
    const P=4.6, PAL=['#1d1b3a','#e4572e','#f3a712','#f5f1e3'].map(hexRGB), S=this._src(px), sx=S.getContext('2d'); sx.setTransform(1,0,0,1,0,0);
    const im=sx.getImageData(0,0,px,px), d=im.data; grain(d,23,5); sx.putImageData(im,0,0);
    const mapped=k=>{ const [C,x]=sheet(px), o=x.createImageData(px,px), q=o.data;
      for(let i=0;i<d.length;i+=4){ let best=0, bd=1e9; for(let m=0;m<k;m++){ const p=PAL[m], er=d[i]-p[0], eg=d[i+1]-p[1], eb=d[i+2]-p[2], dd=er*er*.3+eg*eg*.59+eb*eb*.11; if(dd<bd){ bd=dd; best=m; } }
        const p=PAL[best]; q[i]=p[0]; q[i+1]=p[1]; q[i+2]=p[2]; q[i+3]=255; }
      x.putImageData(o,0,0); return C; };
    const LV=[null,null,mapped(2),mapped(3),mapped(4)], H=86;
    return (c,t)=>{
      const u=mod(t,P), k=u<.8?0:u<1.4?2:u<2.0?3:u<3.9?4:0;
      reset(c,px); c.fillStyle=INK; c.fillRect(0,0,100,100);
      raw(c); c.drawImage(k?LV[k]:S,0,0,px,px*H/100,0,0,px,px*H/100); reset(c,px);
      for(let m=0;m<4;m++){ const x0=3+m*9.6, on=k&&m<k; c.fillStyle='rgb('+PAL[m].join(',')+')'; c.globalAlpha=on?1:.28; c.fillRect(x0,89.4,7.6,7.6); c.globalAlpha=1;
        if(m===0){ c.strokeStyle=on?BONE:'#4a463f'; c.lineWidth=.5; c.strokeRect(x0+.25,89.65,7.1,7.1); } }
      c.font=MONO(5.2); c.fillStyle=k?BONE:'#6d685c'; c.textAlign='right'; c.textBaseline='middle'; c.fillText(k?k+' COLOURS':'OFF',97,93.4);
    };
  } },

/* POP ART. Cut paper, the one playful tile. CANVAS_FX.popart: Grid Two by two, Colours: Hue shifts, Contrast .5, so each square is the
   whole layer scaled down, contrast x1.4 about mid-grey, then the CSS hue-rotate matrix at k x 90 degrees. Colour swap is on at
   2 a second for one bar: square k wears square k-1's colours, on the beat. */
{ id:'popart', name:'Pop Art', section:'Colouring', isNew:true, still:1.3,
  line:'The picture repeats in a grid, every square in its own colours, and the colours can pass round on the beat.',
  _src(px){ const [S,x]=sheet(px); units(x,px);
    /* a cut-paper rangefinder: three flat colours, scissor edges a little off true */
    x.fillStyle=VERM; x.fillRect(0,0,100,100);
    x.save(); x.translate(50,54); x.rotate(-.06); x.translate(-50,-54);
    x.fillStyle=INK; poly(x,[13,40.5, 86.5,38.6, 87.6,76.8, 12.6,78.4]); x.fill();
    x.fillStyle=BONE; poly(x,[13.4,40.8, 86.4,38.9, 86.8,50.6, 13.6,52.2]); x.fill();
    poly(x,[21,33.2, 36.5,32.8, 37.4,39.9, 20.6,40.3]); x.fill();
    poly(x,[68.6,31.4, 76.6,31.2, 77,39.2, 68.4,39.5]); x.fill();
    x.fillStyle=INK; poly(x,[19,43.3, 29.6,43, 29.8,48.8, 19.2,49.1]); x.fill();
    poly(x,[66.6,42.1, 80,41.8, 80.3,47.8, 66.8,48.1]); x.fill();
    x.fillStyle=BONE; x.beginPath(); x.arc(49.6,61.8,20.6,0,TAU); x.fill();
    x.fillStyle=INK; x.beginPath(); x.arc(49.6,61.8,16.6,0,TAU); x.fill();
    x.fillStyle=BONE; x.beginPath(); x.arc(49.6,61.8,9.6,0,TAU); x.fill();
    x.fillStyle=INK; x.beginPath(); x.arc(49.6,61.8,6.4,0,TAU); x.fill();
    x.fillStyle=BONE; poly(x,[43.4,55.2, 47.8,53.6, 46.8,57.2]); x.fill();
    x.restore(); return S; },
  make(px){
    const P=4.2, n=2, S=this._src(px), sx=S.getContext('2d'); sx.setTransform(1,0,0,1,0,0);
    const d=sx.getImageData(0,0,px,px).data, cf=1+.5*.8;
    const hueM=deg=>{ const a=Math.cos(deg*Math.PI/180), b=Math.sin(deg*Math.PI/180);
      return [.213+.787*a-.213*b,.715-.715*a-.715*b,.072-.072*a+.928*b, .213-.213*a+.143*b,.715+.285*a+.140*b,.072-.072*a-.283*b, .213-.213*a-.787*b,.715-.715*a+.715*b,.072+.928*a+.072*b]; };
    const CELL=[0,1,2,3].map(k=>{ const m=hueM(k*360/(n*n)), [C,x]=sheet(px), o=x.createImageData(px,px), q=o.data;
      for(let i=0;i<d.length;i+=4){ const r=(d[i]-128)*cf+128, g=(d[i+1]-128)*cf+128, b=(d[i+2]-128)*cf+128; q[i]=m[0]*r+m[1]*g+m[2]*b; q[i+1]=m[3]*r+m[4]*g+m[5]*b; q[i+2]=m[6]*r+m[7]*g+m[8]*b; q[i+3]=255; }
      x.putImageData(o,0,0); return C; });
    const half=px/2;
    return (c,t)=>{
      const u=mod(t,P), on=u>=.7&&u<3.6, sw=u<1.7?0:u<2.2?1:u<2.7?2:3;
      raw(c); c.imageSmoothingEnabled=true; c.imageSmoothingQuality='high';
      if(!on){ c.drawImage(S,0,0); reset(c,px); return; }
      for(let cy=0;cy<n;cy++) for(let cx=0;cx<n;cx++){ const k0=cy*n+cx, k=(k0+n*n-sw)%(n*n); c.drawImage(CELL[k],Math.round(cx*half),Math.round(cy*half),Math.round(half),Math.round(half)); }
      reset(c,px);
    };
  } },

/* LAMP SHADOW. Viewer overlay. PIXEL_FX.radialshadow at Reach 60 and Light Y 62 (low, like a footlight), with Quality 10 taps,
   Opacity 78 % and Fade 100 % at their defaults: an empty pixel is shadowed when the layer sits between it and the light, found by
   stepping back toward the light at F = 1/(1 + .54 n/10). So the shadow is the layer scaled about the light by 1.054 .. 1.54, tap n
   at strength 1-(n-1)/10 capped at 200/255, the nearest tap winning; the ten taps are why its falloff comes in steps. Painted as
   those scaled outlines with 'darken' on the flat backdrop, which is that rule exactly (checked against the real render at Light X
   15, 50 and 85; the real one also shows fine rounding streaks inside the shadow, which average out at menu size). The layer is
   a colonnade cut out on its own; Light X is keyed 15 -> 85 -> 15; the teal square is the Light X/Y point, the diamonds its keys. */
{ id:'radialshadow', name:'Lamp Shadow', section:'Colouring', isNew:true, still:1.6,
  line:'The layer casts a shadow away from a light you place, and the shadow swings as the light moves.',
  _src(px){ const [L,x]=sheet(px); units(x,px); x.fillStyle=BONE; for(const q of this._cols){ columnPath(x,q[0],q[1],q[2]); x.fill(); } return L; },
  /* comp frame in tile units, and the columns in tile units: base x, base y, height */
  _comp:[4,4,92,78],
  _cols:[[18,77,46],[45,77,46],[72,77,46],[99,77,46]],
  _back:'#b8b09f', _ly:62, _reach:60,
  make(px){
    const P=4.8, [CX,CY,CW,CH]=this._comp, LY=this._ly, K=this._reach/100*.9, TAPS=10, CAP=200, BACK=hexRGB(this._back), cols=this._cols;
    const lvl=[]; for(let n=1;n<=TAPS;n++){ const s=Math.min(CAP,255*(1-(n-1)/TAPS))/255; lvl.push({sc:1+K*n/TAPS, col:'rgb('+BACK.map(v=>Math.round(v*(1-s))).join(',')+')'}); }
    const xAt=u=>u<.6?15:u<2.0?lerp(15,85,E.inOut(seg(u,.6,2.0))):u<2.8?85:u<4.2?lerp(85,15,E.inOut(seg(u,2.8,4.2))):15;
    return (c,t)=>{
      const u=mod(t,P), LX=xAt(u), lx=CX+CW*LX/100, ly=CY+CH*LY/100;
      reset(c,px); c.fillStyle=NAVY; c.fillRect(0,0,100,100);
      c.fillStyle='rgb('+BACK.join(',')+')'; c.fillRect(CX,CY,CW,CH);
      c.save(); c.beginPath(); c.rect(CX,CY,CW,CH); c.clip(); c.globalCompositeOperation='darken';
      for(let i=TAPS-1;i>=0;i--){ const L=lvl[i]; c.save(); c.translate(lx,ly); c.scale(L.sc,L.sc); c.translate(-lx,-ly); c.fillStyle=L.col; for(const q of cols){ columnPath(c,q[0],q[1],q[2]); c.fill(); } c.restore(); }
      c.globalCompositeOperation='source-over'; c.fillStyle=BONE; for(const q of cols){ columnPath(c,q[0],q[1],q[2]); c.fill(); }
      /* flutes: detail inside the cut-out, so they change nothing about the shadow */
      c.strokeStyle='rgba(120,110,95,.5)'; c.lineWidth=.35; for(const q of cols){ const w=q[2]*.115; c.beginPath(); for(const f of [-.45,0,.45]){ c.moveTo(q[0]+f*w,q[1]-q[2]*.12); c.lineTo(q[0]+f*w*.86,q[1]-q[2]*.84); } c.stroke(); }
      c.restore();
      const x0=CX+CW*.15, x1=CX+CW*.85;
      c.strokeStyle=DIM; c.lineWidth=.5; c.setLineDash([1.2,1.2]); c.beginPath(); c.moveTo(x0,ly); c.lineTo(x1,ly); c.stroke(); c.setLineDash([]);
      diamond(c,x0,ly,1.9,YEL); diamond(c,x1,ly,1.9,YEL);
      c.fillStyle=TEAL; c.fillRect(lx-1.7,ly-1.7,3.4,3.4); c.fillStyle=NAVY; c.fillRect(lx-.6,ly-.6,1.2,1.2);
      c.font=MONO(5.8); c.fillStyle=TEXT; c.textAlign='left'; c.textBaseline='middle'; c.fillText('LIGHT X '+String(Math.round(LX)).padStart(2,'0'),CX,91.2);
    };
  } },

/* REPLACE COLOUR. Broadcast bench. PIXEL_FX.replacecolor at its defaults: From #e03131, To #3aa0ff, Tolerance .25 (a 30 degree hue
   window), Replaces: Hue only. A pixel within the window has its hue turned by (To - From), keeping its own saturation and value,
   weighted 1 - distance/window; greys (spread under 8) are skipped. The amber step lights and the dark carpet sit outside the window
   and do not move. The vectorscope is the plate's real Cb/Cr, before and after, each dot in its own hue. */
{ id:'replacecolor', name:'Replace Colour', section:'Colouring', isNew:true, still:2.0,
  line:'One colour in the picture is swapped for another, and every other colour is left alone.',
  _frame:[3,3,94,60],
  _src(px){ const [,,W,H]=this._frame, [S,x]=sheet(Math.round(px*W/100),Math.round(px*H/100)); units(x,px); paintSeats(x,W,H); return S; },
  make(px){
    const P=4, [FX,FY]=this._frame, S=this._src(px), sx=S.getContext('2d'); sx.setTransform(1,0,0,1,0,0);
    const w=S.width, h=S.height, im=sx.getImageData(0,0,w,h), d=im.data; grain(d,5,5); sx.putImageData(im,0,0);
    const hue=(r,g,b)=>{ const mx=Math.max(r,g,b), mn=Math.min(r,g,b), df=mx-mn; if(!df) return 0; let H; if(mx===r) H=((g-b)/df)%6; else if(mx===g) H=(b-r)/df+2; else H=(r-g)/df+4; H*=60; return H<0?H+360:H; };
    const F=hexRGB('#e03131'), T=hexRGB('#3aa0ff'), FH0=hue(...F), SH=hue(...T)-FH0, WIN=.25*120;
    const [R,rx]=sheet(w,h), ro=rx.createImageData(w,h), o=ro.data; o.set(d);
    for(let i=0;i<d.length;i+=4){ const r=d[i], g=d[i+1], b=d[i+2], mx=Math.max(r,g,b), mn=Math.min(r,g,b), df=mx-mn; if(df<8) continue;
      let H=hue(r,g,b), dd=Math.abs(H-FH0); if(dd>180) dd=360-dd; if(dd>WIN) continue;
      const wt=1-dd/WIN; let NH=(H+SH)%360; if(NH<0) NH+=360; const V=mx/255, Sa=df/mx, C=V*Sa, X=C*(1-Math.abs((NH/60)%2-1)), m=V-C;
      let q; if(NH<60) q=[C,X,0]; else if(NH<120) q=[X,C,0]; else if(NH<180) q=[0,C,X]; else if(NH<240) q=[0,X,C]; else if(NH<300) q=[X,0,C]; else q=[C,0,X];
      o[i]=r+((q[0]+m)*255-r)*wt; o[i+1]=g+((q[1]+m)*255-g)*wt; o[i+2]=b+((q[2]+m)*255-b)*wt; }
    rx.putImageData(ro,0,0);
    /* vectorscope plates: every 3rd pixel's Cb/Cr, each dot in its own hue (a colour scope), 75 % targets */
    const SR=12.6, SCX=17, SCY=80.4, sp=Math.round(px*SR*2.4/100);
    const scope=src=>{ const [C,x]=sheet(sp), c0=sp/2, k=c0/1.2/128, dz=Math.max(1,Math.round(sp/60)), acc=new Float32Array(sp*sp*4), A=.3;
      for(let i=0;i<src.length;i+=12){ const r=src[i], g=src[i+1], b=src[i+2], cb=-.169*r-.331*g+.5*b, cr=.5*r-.419*g-.081*b, m=Math.max(r,g,b,1)/255, R0=r/m, G0=g/m, B0=b/m;
        const X0=Math.round(c0+cb*k-dz/2), Y0=Math.round(c0-cr*k-dz/2);
        for(let yy=Y0;yy<Y0+dz;yy++) for(let xx=X0;xx<X0+dz;xx++){ if(xx<0||yy<0||xx>=sp||yy>=sp) continue; const j=(yy*sp+xx)*4; acc[j]=R0*A+acc[j]*(1-A); acc[j+1]=G0*A+acc[j+1]*(1-A); acc[j+2]=B0*A+acc[j+2]*(1-A); acc[j+3]=A+acc[j+3]*(1-A); } }
      /* acc holds 'source-over' in premultiplied form: the same picture fillRect at alpha .3 would paint */
      const o=x.createImageData(sp,sp); for(let j=0;j<acc.length;j+=4){ const a=acc[j+3]; if(a>0){ o.data[j]=acc[j]/a; o.data[j+1]=acc[j+1]/a; o.data[j+2]=acc[j+2]/a; o.data[j+3]=a*255; } }
      x.putImageData(o,0,0); return C; };
    const SC0=scope(d), SC1=scope(o);
    const TG=[['R',191,0,0],['MG',191,0,191],['B',0,0,191],['CY',0,191,191],['G',0,191,0],['YL',191,191,0]].map(q=>{ const cb=-.169*q[1]-.331*q[2]+.5*q[3], cr=.5*q[1]-.419*q[2]-.081*q[3]; return [q[0],SCX+cb/128*SR/1.2,SCY-cr/128*SR/1.2]; });
    return (c,t)=>{
      const u=mod(t,P), fr=Math.floor(u*25), on=u>=.8&&u<3.4;
      reset(c,px); c.fillStyle='#000'; c.fillRect(0,0,100,100);
      raw(c); c.drawImage(on?R:S,Math.round(px*FX/100),Math.round(px*FY/100)); reset(c,px);
      /* vectorscope */
      c.strokeStyle='rgba(238,242,248,.42)'; c.lineWidth=.4; c.beginPath(); c.arc(SCX,SCY,SR,0,TAU); c.stroke();
      c.beginPath(); for(let k=0;k<12;k++){ const a=k*TAU/12; c.moveTo(SCX+Math.cos(a)*SR,SCY+Math.sin(a)*SR); c.lineTo(SCX+Math.cos(a)*(SR-1.2),SCY+Math.sin(a)*(SR-1.2)); } c.stroke();
      c.strokeStyle='rgba(238,242,248,.55)'; for(const q of TG){ c.strokeRect(q[1]-1,q[2]-1,2,2); }
      raw(c); c.drawImage(on?SC1:SC0,Math.round(px*(SCX-SR*1.2)/100),Math.round(px*(SCY-SR*1.2)/100)); reset(c,px);
      /* From / To: the effect's two colour controls */
      c.fillStyle='#e03131'; c.fillRect(37,70.5,10,6.5); c.fillStyle='#3aa0ff'; c.fillRect(57,70.5,10,6.5);
      c.strokeStyle=on?TEXT:'#59606c'; c.lineWidth=.6; c.beginPath(); c.moveTo(48.8,73.75); c.lineTo(55.2,73.75); c.moveTo(53.4,72.1); c.lineTo(55.3,73.75); c.lineTo(53.4,75.4); c.stroke();
      const p2=v=>(v<10?'0':'')+v, tc=12*25+4+fr;
      c.font=MONO(5.4); c.textBaseline='middle'; c.textAlign='left'; c.fillStyle=TEXT; c.fillText('00:00:'+p2(Math.floor(tc/25)%60)+':'+p2(tc%25),37,89.5);
      c.textAlign='right'; c.fillStyle=on?TEXT:DIM; c.fillText(on?'REPLACE':'BYPASS',97,73.8);
    };
  } }

];
/* make() and the source painters read their own tile's numbers through `this`; bind them so a detached call still works */
MINE.forEach(T=>{ for(const k of ['make','_src','_frames']) if(typeof T[k]==='function') T[k]=T[k].bind(T); });
window.FX_TILES.push(...MINE);
})();
