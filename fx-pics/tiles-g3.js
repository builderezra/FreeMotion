/* FreeMotion effect pictures, g3: Cartoon, Film Damage, Heart and Dispersion, redrawn after his review of the preview.
   Every change on a picture is the effect's own arithmetic from js/compositor.js, mirrored here and run on the picture:
   PIXEL_FX.cartoon (Kuwahara, steps, Sobel outline), PIXEL_FX.filmdamage (its hashes, placement and order), renderMesh on
   bPrism(heartPts(28)) for the Heart, PIXEL_FX.dispersion's noise front. Cartoon is the one tile here on one of his photos. */
(function(){ 'use strict';
const {TAU,clamp,lerp,seg,E,rng,hash,vnoise,canvasOf,photo,photoCover}=window.FXK;

const BONE='#e7e2d5', INK='#16130f', COAL='#0c0c0d';
const MONO=s=>'bold '+s+'px "Courier Prime","Courier New",monospace';
const mod=(t,P)=>((t%P)+P)%P;
const reset=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; c.imageSmoothingEnabled=true; c.imageSmoothingQuality='high'; };
const sheet=(w,h)=>{ const C=document.createElement('canvas'); C.width=w; C.height=h===undefined?w:h; return [C,C.getContext('2d')]; };
const sheetR=(w,h)=>{ const C=document.createElement('canvas'); C.width=w; C.height=h===undefined?w:h; return [C,C.getContext('2d',{willReadFrequently:true})]; };
function put(W,H,data){ const [C,x]=sheet(W,H), im=x.createImageData(W,H); im.data.set(data); x.putImageData(im,0,0); return C; }
/* damped settle: lands, overshoots a little, stops */
const settle=p=>p<=0?0:p>=1?1:1-Math.pow(2,-8.5*p)*Math.cos(p*9.5);
/* a flat Courier tab; right = true anchors it by its right edge */
function tab(c,x,y,txt,s,bg,fg,right){ c.font=MONO(s); const w=c.measureText(txt).width+s*.9; if(right) x-=w; c.fillStyle=bg; c.fillRect(x,y,w,s*1.5); c.fillStyle=fg; c.textBaseline='middle'; c.textAlign='left'; c.fillText(txt,x+s*.45,y+s*.8); return w; }
/* one of his photographs, cover-fit into an N px square, read once */
function photoPixels(key,N,crop){ const [,x]=sheetR(N); x.imageSmoothingEnabled=true; x.imageSmoothingQuality='high'; const im=photo(key);
  if(im&&crop){ const sw=im.naturalWidth, sh=im.naturalHeight; x.drawImage(im,crop.x*sw,crop.y*sh,crop.w*sw,crop.w*sh,0,0,N,N); }
  else if(im){ const s=Math.max(N/im.naturalWidth,N/im.naturalHeight), w=im.naturalWidth*s, h=im.naturalHeight*s; x.drawImage(im,(N-w)/2,(N-h)/2,w,h); }
  return x.getImageData(0,0,N,N).data; }

/* ---------- PIXEL_FX.cartoon, mirrored (js/compositor.js, CT_KNEE 24, CT_H_MAX 16, CT_LEVELS) ----------
   Opaque picture, so the alpha-weighted sums of the app's padded plate are the plain sums over the part of each square inside
   the frame, and the alpha Sobel is zero. */
const ctLuma=(a,i)=>((299*a[i]+587*a[i+1]+114*a[i+2]+500)/1000)|0;
function ctKuwahara(s,d,W,H,h){
  const W1=W+1, M=W1*(H+1), I=[0,1,2,3,4,5].map(()=>new Float64Array(M));
  const [I0,I1,I2,I3,I4,I5]=I;
  for(let y=0;y<H;y++){ let a0=0,a1=0,a2=0,a3=0,a4=0,a5=0; const r=(y+1)*W1, rp=y*W1;
    for(let x=0;x<W;x++){ const i=(y*W+x)*4, yy=ctLuma(s,i), q=r+x+1, qp=rp+x+1;
      a0+=1; a1+=s[i]; a2+=s[i+1]; a3+=s[i+2]; a4+=yy; a5+=yy*yy;
      I0[q]=I0[qp]+a0; I1[q]=I1[qp]+a1; I2[q]=I2[qp]+a2; I3[q]=I3[qp]+a3; I4[q]=I4[qp]+a4; I5[q]=I5[qp]+a5; } }
  const box=(A,x0,y0,x1,y1)=>A[(y1+1)*W1+x1+1]-A[y0*W1+x1+1]-A[(y1+1)*W1+x0]+A[y0*W1+x0];
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    let best=Infinity, b0=0,b1=0,b2=0,b3=0, bx=0;
    for(let q=0;q<4;q++){ const cx=x+((q&1)?h:-h), cy=y+(q<2?-h:h);
      const x0=Math.max(0,cx-h), y0=Math.max(0,cy-h), x1=Math.min(W-1,cx+h), y1=Math.min(H-1,cy+h); if(x0>x1||y0>y1) continue;
      const a=box(I0,x0,y0,x1,y1); if(!(a>0)) continue;
      const m=box(I4,x0,y0,x1,y1)/a, va=box(I5,x0,y0,x1,y1)/a-m*m;
      if(va<best){ best=va; bx=1; b0=a; b1=box(I1,x0,y0,x1,y1); b2=box(I2,x0,y0,x1,y1); b3=box(I3,x0,y0,x1,y1); } }
    if(bx){ const i=(y*W+x)*4; d[i]=b1/b0; d[i+1]=b2/b0; d[i+2]=b3/b0; } }
}
function ctGrow(src,dst,W,H,ri,fr,alongRows){ const n=alongRows?W:H, m=alongRows?H:W, step=alongRows?1:W;
  for(let q=0;q<m;q++){ const o=alongRows?q*W:q;
    for(let k=0;k<n;k++){ let best=0; const lo=k-ri<0?0:k-ri, hi=k+ri>n-1?n-1:k+ri;
      for(let c=lo;c<=hi;c++){ const v=src[o+c*step]; if(v>best) best=v; }
      if(fr>0){ if(k-ri-1>=0){ const v=src[o+(k-ri-1)*step]*fr; if(v>best) best=v; } if(k+ri+1<n){ const v=src[o+(k+ri+1)*step]*fr; if(v>best) best=v; } }
      dst[o+k*step]=best; } } }
function cartoonPort(src,W,H,o){
  const N=W*H, S=o.ps, h=Math.min(16,Math.round(o.smooth*S/2)), steps=o.steps, thr=o.threshold*2.55, thr1=thr+24, sat=o.sat/100;
  let sm=src;
  if(h>=1){ const A=new Uint8ClampedArray(src), B=new Uint8ClampedArray(src.length); ctKuwahara(src,A,W,H,h); B.set(A); ctKuwahara(A,B,W,H,h); sm=B; }
  const Y=new Float64Array(N), Eg=new Float32Array(N);
  for(let j=0;j<N;j++) Y[j]=ctLuma(sm,j*4)*255;
  for(let y=0;y<H;y++){ const ru=(y>0?y-1:0)*W, rc=y*W, rd=(y<H-1?y+1:H-1)*W;
    for(let x=0;x<W;x++){ const xl=x>0?x-1:0, xr=x<W-1?x+1:W-1;
      const gx=(Y[ru+xr]+2*Y[rc+xr]+Y[rd+xr])-(Y[ru+xl]+2*Y[rc+xl]+Y[rd+xl]), gy=(Y[rd+xl]+2*Y[rd+x]+Y[rd+xr])-(Y[ru+xl]+2*Y[ru+x]+Y[ru+xr]);
      const mg=Math.sqrt(gx*gx+gy*gy)/1020;
      Eg[rc+x]=mg<=thr?0:mg>=thr1?1:(u=>u*u*(3-2*u))((mg-thr)/24); } }
  const Wp=o.width*S;
  if(Wp<2){ const k=Wp/2; for(let j=0;j<N;j++) if(Eg[j]>0) Eg[j]*=k; }
  else if(Wp>2){ const F=new Float32Array(N), r=(Wp-2)/2, ri=Math.floor(r), fr=r-ri; ctGrow(Eg,F,W,H,ri,fr,true); ctGrow(F,Eg,W,H,ri,fr,false); }
  const LV=[]; for(let k=0;k<steps;k++) LV.push(Math.round((2*k+1)*255/(2*steps)));
  const out=new Uint8ClampedArray(N*4);
  for(let j=0,i=0;j<N;j++,i+=4){ const r=sm[i], g=sm[i+1], b=sm[i+2], Yi=ctLuma(sm,i), Lf=(299*r+587*g+114*b)/1000, q=LV[(Yi*steps)>>8];
    const cr=(r-Lf)*sat, cg=(g-Lf)*sat, cb=(b-Lf)*sat, hi=Math.max(cr,cg,cb), lo=Math.min(cr,cg,cb); let f=1;
    if(q+hi>255) f=(255-q)/hi; if(q+lo<0){ const f2=q/-lo; if(f2<f) f=f2; }
    let R=q+cr*f, G=q+cg*f, B=q+cb*f; const e=Eg[j]; if(e>0){ R-=R*e; G-=G*e; B-=B*e; }   /* Edge colour black */
    out[i]=R; out[i+1]=G; out[i+2]=B; out[i+3]=255; }
  return out;
}

/* ---------- PIXEL_FX.filmdamage's hash, as in js/compositor.js ---------- */
function fdMix(h){ h=Math.imul(h^(h>>>16),0x85ebca6b); h=Math.imul(h^(h>>>13),0xc2b2ae35); return h^(h>>>16); }
function fdHash(a,b,c){ return (fdMix(fdMix(fdMix((a|0)^0x2545f491)+(b|0))+(c|0))>>>0)/4294967296; }
const FD_FADE=[[0.45,28,1.10,0.86,0.98],[0.92,22,1.08,0.94,0.76],[1,24,1,1,1]];

/* ---------- renderMesh and the heart prism, as in js/compositor.js ---------- */
function heartPts(n){ const p=[]; for(let i=0;i<n;i++){ const a=i*2*Math.PI/n; p.push([Math.pow(Math.sin(a),3)*16/17,-(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a))/17]); } return p; }
function bPrism(pts,depth){ const V=[],T=[],n=pts.length,hz=depth/2; let cx=0,cy=0; for(let i=0;i<n;i++){ cx+=pts[i][0]; cy+=pts[i][1]; } cx/=n; cy/=n;
  const f0=V.length; V.push([cx,cy,hz]); for(let i=0;i<n;i++) V.push([pts[i][0],pts[i][1],hz]); for(let i=0;i<n;i++) T.push([f0,f0+1+i,f0+1+(i+1)%n]);
  const b0=V.length; V.push([cx,cy,-hz]); for(let i=0;i<n;i++) V.push([pts[i][0],pts[i][1],-hz]); for(let i=0;i<n;i++) T.push([b0,b0+1+(i+1)%n,b0+1+i]);
  for(let i=0;i<n;i++){ const p=pts[i], q=pts[(i+1)%n], s=V.length; V.push([p[0],p[1],hz],[q[0],q[1],hz],[q[0],q[1],-hz],[p[0],p[1],-hz]); T.push([s,s+1,s+2],[s,s+2,s+3]); }
  return {v:V,t:T}; }

window.FX_TILES.push(

/* CARTOON. A, graded still, on his photograph 'clouds' (used once elsewhere, not in Stylize): PIXEL_FX.cartoon's three stages,
   mirrored line for line, run once in make() on the photo as a 1080 frame drawn 480 px wide (plate scale .444): two Kuwahara passes
   at Smoothing 8, Shading steps 4, Edge width 10, Edge threshold 15 %, Saturation 150 %, Edge colour black, Mix 100 %. Checked
   beside the app's own render at the same settings: mean difference 3.4 levels of 255 (the plain photo is 18 away). A before/after
   slider: the photo, labelled BEFORE; the AFTER half wipes in from the right and holds at the middle, then takes the whole frame,
   holds, and cuts back. The tabs and the slider are furniture; each tab is clipped to its own half. */
{ id:'cartoon', name:'Cartoon', section:'Stylize', isNew:true, still:2.1,
  line:'The picture is smoothed into flat patches of colour, its shading cut into a few steps, with dark outlines drawn round the shapes.',
  make(px){
    const P=4.8, N=480;
    const src=photoPixels('clouds',N);
    const toon=cartoonPort(src,N,N,{ps:N/1080,smooth:8,steps:4,width:10,threshold:15,sat:150});
    const SRC=put(N,N,src), TOON=put(N,N,toon);
    const xAt=u=>u<.7?100:u<1.6?lerp(100,50,settle(seg(u,.7,1.6))):u<2.7?50:u<3.3?lerp(50,0,E.inOut(seg(u,2.7,3.3))):u<4.3?0:100;
    return (c,t)=>{
      const u=mod(t,P), X=xAt(u); reset(c,px);
      c.drawImage(SRC,0,0,100,100);
      if(X<100){ c.save(); c.beginPath(); c.rect(X,0,100-X,100); c.clip(); c.drawImage(TOON,0,0,100,100); c.restore(); }
      /* the labels belong to their halves, so each one wipes with its picture */
      if(X>0){ c.save(); c.beginPath(); c.rect(0,0,X,100); c.clip(); tab(c,3.5,3.5,'BEFORE',4.6,INK,BONE,false); c.restore(); }
      if(X<100){ c.save(); c.beginPath(); c.rect(X,0,100-X,100); c.clip(); tab(c,96.5,3.5,'AFTER',4.6,BONE,INK,true); c.restore(); }
      /* the slider: a hairline and its handle */
      if(X>0&&X<100){
        c.fillStyle=BONE; c.fillRect(X-.35,0,.7,100);
        c.fillRect(X-3.2,46.8,6.4,6.4);
        c.fillStyle=INK; c.beginPath(); c.moveTo(X-.9,48.4); c.lineTo(X-2.4,50); c.lineTo(X-.9,51.6); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(X+.9,48.4); c.lineTo(X+2.4,50); c.lineTo(X+.9,51.6); c.closePath(); c.fill();
      }
    };
  } },

/* FILM DAMAGE. A drawn outback frame (windmill, tank, red-dirt track, a big sky) in full colour, then PIXEL_FX.filmdamage on a 540 px
   project, part for part in the kernel's order: the frame weaves and now and then slips a splice (rows wrap, the black frame line at
   the join), six scratch tracks, dust and hairs (dark and light), Colour fade to Sepia, a Burn blooming from one edge, the lamp's
   Flicker. Scratches .7, Dust .7, Hairs .5, Dirt Both, Flicker .55, Gate weave 3 px, Burns .85, Splice jumps .2, Colour fade .9 to
   Sepia, Projector speed 18, Pattern 0; the clip runs from film frame 40, so the left burn peaks at the still and the right one
   near the end. Colour fade is affine, so it is applied to the frame once and the marks (and the frame line) are drawn in the
   faded black and white, which is the same thing. Checked beside the app's render on a 540 project at the same film frame: the
   same scratches, specks, hairs and burn edge. Clean colour frame, the worn print, back. */
{ id:'filmdamage', name:'Film Damage', section:'Stylize', isNew:true, still:1.7,
  line:'Scratches, dust and hairs run over the picture as the lamp flickers, the frame weaves and jumps, a burn blooms in from the edge and the colour fades to sepia.',
  make(px){
    const P=4.6, FPS=18, ON0=.55, ON1=4.05, T0=40/18, U=100/540, W=540, H=540, MG=6;
    const SCR=.7, DUST=.7, HAIR=.5, FLK=.55, WEAVE=3, BURN=.85, SPLICE=.2, FADE=.9, FS=FD_FADE[1], seedK=0;
    /* the frame, painted with a margin so a weave never shows an edge (the kernel repeats the edge pixel; this is the same at 3 px) */
    const SP=Math.round(px*(100+2*MG)/100), [S,sx]=sheet(SP); sx.setTransform(px/100,0,0,px/100,MG*px/100,MG*px/100);
    const HZ=61, r0=rng(5402);
    { const x=sx;
      let g=x.createLinearGradient(0,-MG,0,HZ); g.addColorStop(0,'#0e3a84'); g.addColorStop(.62,'#4b8ac4'); g.addColorStop(1,'#d3e3e8'); x.fillStyle=g; x.fillRect(-MG,-MG,100+2*MG,HZ+MG);
      /* a low flat-topped range on the horizon */
      x.fillStyle='#7b7590'; x.beginPath(); x.moveTo(40,HZ); x.lineTo(46,HZ-3.6); x.lineTo(63,HZ-4.2); x.lineTo(68,HZ-1.6); x.lineTo(80,HZ-1.9); x.lineTo(84,HZ); x.closePath(); x.fill();
      /* red dirt to the front */
      g=x.createLinearGradient(0,HZ,0,100+MG); g.addColorStop(0,'#c86e3e'); g.addColorStop(1,'#5c200c'); x.fillStyle=g; x.fillRect(-MG,HZ,100+2*MG,100-HZ+MG);
      /* the track: two wheel ruts running to the vanishing point */
      const VX=70, VY=HZ, YB=100+MG;
      const band=(b0,b1,col)=>{ x.fillStyle=col; x.beginPath(); x.moveTo(VX-.2,VY); x.lineTo(VX+.2,VY); x.lineTo(b1,YB); x.lineTo(b0,YB); x.closePath(); x.fill(); };
      { const rg=x.createLinearGradient(0,HZ,0,YB); rg.addColorStop(0,'#d99062'); rg.addColorStop(1,'#a85a30'); band(30,98,rg); }
      band(38,47,'rgba(110,40,14,.38)'); band(80,89,'rgba(110,40,14,.38)');
      /* spinifex: dark clumps either side of the track, smaller toward the horizon */
      for(let i=0;i<90;i++){ const d=r0(), y=HZ+.8+Math.pow(d,1.7)*(YB-HZ), s=.22+(y-HZ)/(100-HZ)*2.4, xx=-MG+r0()*(100+2*MG), w=(y-VY)/(YB-VY), sh=r0();
        if(xx>VX+(26-VX)*w&&xx<VX+(102-VX)*w) continue;
        x.fillStyle=sh<.5?'#55522a':'#6b6733'; x.beginPath(); x.ellipse(xx,y,s*1.5,s*.7,0,Math.PI,0); x.fill(); }
      /* the tank: a corrugated cylinder on a stand */
      const TK=27, TW=15;
      x.fillStyle='#3a2f28'; x.fillRect(TK+1,HZ-6,1.1,7.5); x.fillRect(TK+TW-2.1,HZ-6,1.1,7.5);
      x.fillStyle='#9fa3a2'; x.fillRect(TK,HZ-15,TW,9.4);
      for(let k=0;k<8;k++){ x.fillStyle=k%2?'#8b908f':'#b4b8b5'; x.fillRect(TK+k*TW/8,HZ-15,TW/16,9.4); }
      x.fillStyle='#6d7271'; x.fillRect(TK+TW*.72,HZ-15,TW*.28,9.4);
      x.fillStyle='#7f8483'; x.beginPath(); x.ellipse(TK+TW/2,HZ-15,TW/2,1.1,0,Math.PI,0); x.fill();
      /* the windmill: a tapered lattice tower, a wheel of blades and the tail vane, dark against the sky */
      const MX=17, top=22, base=HZ+2.5, D='#231d19';
      x.strokeStyle=D; x.lineCap='round';
      const legL=[MX-5.2,base,MX-1.1,top], legR=[MX+5.2,base,MX+1.1,top];
      x.lineWidth=.9; [legL,legR].forEach(L=>{ x.beginPath(); x.moveTo(L[0],L[1]); x.lineTo(L[2],L[3]); x.stroke(); });
      x.lineWidth=.45; const at=(L,f)=>[lerp(L[0],L[2],f),lerp(L[1],L[3],f)];
      const fs=[0,.22,.42,.6,.76,.9];
      for(let k=0;k<fs.length-1;k++){ const a=at(legL,fs[k]), b=at(legR,fs[k]), c2=at(legL,fs[k+1]), d2=at(legR,fs[k+1]);
        x.beginPath(); x.moveTo(a[0],a[1]); x.lineTo(d2[0],d2[1]); x.moveTo(b[0],b[1]); x.lineTo(c2[0],c2[1]); x.moveTo(c2[0],c2[1]); x.lineTo(d2[0],d2[1]); x.stroke(); }
      /* the tail: a boom back to a flat vane */
      x.lineWidth=.6; x.beginPath(); x.moveTo(MX,top-1); x.lineTo(MX+13,top-2.4); x.stroke();
      x.fillStyle=D; x.beginPath(); x.moveTo(MX+10.5,top-6.6); x.lineTo(MX+15.5,top-7.4); x.lineTo(MX+15.5,top+1.4); x.lineTo(MX+10.5,top+.4); x.closePath(); x.fill();
      /* the wheel, seen a little from the side */
      const WX=MX-1.2, WY=top-1.4, RW=9, SQ=.82;
      x.save(); x.translate(WX,WY); x.scale(SQ,1);
      for(let k=0;k<18;k++){ const a=k*TAU/18+.1, a0=a-.075, a1=a+.11;
        x.fillStyle=D; x.beginPath(); x.moveTo(Math.cos(a0)*2.6,Math.sin(a0)*2.6); x.lineTo(Math.cos(a0)*RW,Math.sin(a0)*RW); x.lineTo(Math.cos(a1)*RW,Math.sin(a1)*RW); x.lineTo(Math.cos(a1)*2.6,Math.sin(a1)*2.6); x.closePath(); x.fill(); }
      x.lineWidth=.5; x.beginPath(); x.arc(0,0,RW-.2,0,TAU); x.stroke(); x.beginPath(); x.arc(0,0,5.4,0,TAU); x.stroke();
      x.beginPath(); x.arc(0,0,1.5,0,TAU); x.fill();
      x.restore();
    }
    /* Colour fade to Sepia, once: the kernel's own arithmetic per pixel */
    const fadeRGB=(r,g,b)=>{ const L=.299*r+.587*g+.114*b, keep=1-FS[0], lift=FS[1], gain=1-FS[1]/255-.07;
      return [r+((lift+(L+(r-L)*keep)*gain)*FS[2]-r)*FADE, g+((lift+(L+(g-L)*keep)*gain)*FS[3]-g)*FADE, b+((lift+(L+(b-L)*keep)*gain)*FS[4]-b)*FADE].map(v=>clamp(v,0,255)); };
    const [SF,sf]=sheetR(SP); sf.drawImage(S,0,0); { const im=sf.getImageData(0,0,SP,SP), d=im.data; for(let i=0;i<d.length;i+=4){ const q=fadeRGB(d[i],d[i+1],d[i+2]); d[i]=q[0]; d[i+1]=q[1]; d[i+2]=q[2]; } sf.putImageData(im,0,0); }
    const K0=fadeRGB(0,0,0).map(Math.round), K1=fadeRGB(255,255,255).map(Math.round);
    const DARK='rgb('+K0.join(',')+')', LIGHT='rgb('+K1.join(',')+')';
    const [F,fx]=sheet(px), lightOf=h=>h<.5;
    const ink=(light,a)=>{ fx.globalAlpha=Math.min(1,a); fx.fillStyle=fx.strokeStyle=light?LIGHT:DARK; };
    const dot=(cx,cy,r,op,light)=>{ ink(light,op); fx.beginPath(); fx.arc(cx,cy,(r+.5)*U,0,TAU); fx.fill(); };
    return (c,t)=>{
      const u=mod(t,P);
      reset(c,px);
      if(!(u>=ON0&&u<ON1)){ c.drawImage(S,-MG,-MG,100+2*MG,100+2*MG); return; }
      const frame=Math.floor((u-ON0+T0)*FPS+1e-9);
      /* 1. where the frame sits: weave, and a splice jump with the frame line at the join (px, then units) */
      const dx=WEAVE*(.6*Math.sin(TAU*(frame/11+fdHash(7,seedK,1)))+.4*(2*fdHash(frame,seedK+2,0)-1));
      const dy=.45*WEAVE*(.6*Math.sin(TAU*(frame/17+fdHash(7,seedK,2)))+.4*(2*fdHash(frame,seedK+3,0)-1));
      let jump=0; const gq=frame*.6180339887498949+.5+seedK*.7548776662466927, spliced=(gq-Math.floor(gq))<SPLICE*.25;
      if(spliced){ const h=fdHash(frame,seedK+4,0), m=h<.5?h*2:h*2-1; jump=(h<.5?-1:1)*(.08+.27*m)*H; }
      reset(fx,px);
      const DX=dx*U, DY=dy*U;
      if(!spliced) fx.drawImage(SF,DX-MG,DY-MG,100+2*MG,100+2*MG);
      else { const j=mod(DY+jump*U,100);
        fx.save(); fx.beginPath(); fx.rect(0,j,100,100-j); fx.clip(); fx.drawImage(SF,DX-MG,j-MG,100+2*MG,100+2*MG); fx.restore();
        fx.save(); fx.beginPath(); fx.rect(0,0,100,j); fx.clip(); fx.drawImage(SF,DX-MG,j-100-MG,100+2*MG,100+2*MG); fx.restore();
        fx.fillStyle=DARK; fx.fillRect(0,j-2,100,4); }
      /* 2. the dirt on the print */
      fx.lineCap='butt'; fx.lineJoin='round';
      for(let k=0;k<6;k++){
        const L=14+Math.floor(fdHash(k,seedK+30,0)*40), off=Math.floor(fdHash(k,seedK+31,0)*L), ep=Math.floor((frame+off)/L);
        if(fdHash(ep,seedK+32,k)>=SCR) continue;
        const ph=(frame+off-ep*L)/L, x0=fdHash(ep,seedK+33,k), drift=(fdHash(ep,seedK+34,k)-.5)*.04;
        const cx=((x0+drift*ph)*W+(fdHash(frame,seedK+35,k)-.5)*1.2)*U, hw=(.3+.95*fdHash(ep,seedK+36,k))*U;
        const op=(.35+.5*fdHash(ep,seedK+37,k))*(.7+.3*fdHash(frame,seedK+38,k)), light=lightOf(fdHash(ep,seedK+39,k));
        const part=fdHash(ep,seedK+40,k), ya=part<.7?0:Math.floor(fdHash(ep,seedK+41,k)*H*.5), yb=part<.7?H:Math.min(H,ya+Math.ceil(H*(.3+.5*fdHash(ep,seedK+42,k))));
        const wav=(fdHash(ep,seedK+43,k)-.5)*.006*W, wf=1+3*fdHash(ep,seedK+44,k);
        ink(light,op); fx.lineWidth=2*hw; fx.beginPath();
        for(let y=ya;y<=yb;y+=4){ const xc=cx+wav*U*Math.sin(TAU*wf*y/H); if(y===ya) fx.moveTo(xc,y*U); else fx.lineTo(xc,y*U); }
        fx.stroke();
      }
      const n=Math.floor(DUST*30+fdHash(frame,seedK+10,0));
      for(let i=0;i<n;i++){
        const h3=fdHash(frame,seedK+13,i), h4=fdHash(frame,seedK+14,i), cx=fdHash(frame,seedK+11,i)*100, cy=fdHash(frame,seedK+12,i)*100, r=1+5*h3*h3*h3, op=.55+.45*h4, light=lightOf(fdHash(frame,seedK+15,i));
        dot(cx,cy,r,op,light);
        if(h4>.7){ const a=6.2832*fdHash(frame,seedK+16,i); dot(cx+Math.cos(a)*r*U,cy+Math.sin(a)*r*U,r*.6,op,light); }
      }
      const nh=Math.floor(HAIR*3+fdHash(frame,seedK+20,0));
      fx.lineCap='round';
      for(let i=0;i<nh;i++){
        let x=fdHash(frame,seedK+21,i)*100, y=fdHash(frame,seedK+22,i)*100;
        const len=(.04+.1*fdHash(frame,seedK+23,i))*100, ang=fdHash(frame,seedK+24,i)*6.2832, bend=(fdHash(frame,seedK+25,i)-.5)*2.2, wig=fdHash(frame,seedK+27,i)*6.2832, hw=(.7+.8*fdHash(frame,seedK+26,i))*U;
        ink(lightOf(fdHash(frame,seedK+28,i)),.85); fx.lineWidth=2*hw+U; fx.beginPath(); fx.moveTo(x,y);
        for(let q=1;q<=12;q++){ const s=(q-.5)/12, th=ang+bend*(s-.5)*Math.PI+.35*Math.sin(wig+s*7); x+=Math.cos(th)*len/12; y+=Math.sin(th)*len/12; fx.lineTo(x,y); }
        fx.stroke();
      }
      fx.globalAlpha=1;
      /* 3. the light through it: the Burn, screened in from one edge, a new edge every 40 film frames */
      { const sl=Math.floor(frame/40), ph=(frame-sl*40)/40, e=fdHash(sl,seedK+50,0), along=.15+.7*fdHash(sl,seedK+51,0);
        let bx, by; if(e<.25){ bx=0; by=along*100; } else if(e<.5){ bx=100; by=along*100; } else if(e<.75){ bx=along*100; by=0; } else { bx=along*100; by=100; }
        const br=(.35+.35*fdHash(sl,seedK+52,0))*100, sw=Math.sin(Math.PI*ph), bi=BURN*(.2+.8*sw*sw)*(.85+.15*fdHash(frame,seedK+53,0));
        const g=fx.createRadialGradient(bx,by,0,bx,by,br);
        for(let s=0;s<=12;s++){ const q=s/12, f=(1-q)*(1-q), k=bi*f; g.addColorStop(q,'rgb('+Math.round(255*k)+','+Math.round(k*(120+125*f))+','+Math.round(k*(40+180*f))+')'); }
        fx.globalCompositeOperation='screen'; fx.fillStyle=g; fx.fillRect(0,0,100,100); fx.globalCompositeOperation='source-over'; }
      /* the lamp: Flicker, and a splice frame's pop, one multiply over all of it */
      let mul=1+FLK*(.32*(2*fdHash(frame,seedK+1,0)-1)+.08*Math.sin(TAU*frame/7.3)); if(spliced) mul*=1.25;
      c.drawImage(F,0,0,100,100);
      if(mul<1){ c.globalAlpha=1-mul; c.fillStyle='#000'; c.fillRect(0,0,100,100); }
      else if(mul>1){ c.globalCompositeOperation='lighter'; c.globalAlpha=Math.min(1,mul-1); c.drawImage(F,0,0,100,100); }
      reset(c,px);
    };
  } },

/* HEART. Just the heart: a plain pink layer cut to the Heart solid at its defaults (Depth 45, Size 85, Shading .6, Perspective
   50, Rotate X 15), drawn by renderMesh mirrored (rotate X, then Y, then Z; F 3.2; painter sort on summed depth; 0.4 px seam
   inflation; flat double-sided Lambert from (.42, -.55, .72)). A flat layer makes every face its pink times the face's shade.
   Rotate Y keyed: 30, held; half a turn with a settle; held; the other half. */
{ id:'heart3d', name:'Heart', section:'3D', isNew:true, still:.9,
  line:'The layer is cut to a heart and given depth, so it turns in space as a solid.',
  make(px){
    const P=4.2, PINK=[255,102,163], LS=78, R=LS/2*.85, CX=50, CY=46, SH=.6, Fp=3.2, DEG=Math.PI/180;
    const mesh=bPrism(heartPts(28),.45), V=mesh.v, T=mesh.t, n=V.length, m=T.length;
    const SX=new Float64Array(n), SY=new Float64Array(n), X3=new Float64Array(n), Y3=new Float64Array(n), Z3=new Float64Array(n), zk=new Float64Array(m), ord=[];
    for(let i=0;i<m;i++) ord.push(i);
    const ryAt=u=>u<1.0?30:u<1.75?lerp(30,210,settle(seg(u,1.0,1.75))):u<3.1?210:u<3.85?lerp(210,390,settle(seg(u,3.1,3.85))):390;
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      c.fillStyle=INK; c.fillRect(0,0,100,100);
      const rx=15*DEG, ry=ryAt(u)*DEG, cX=Math.cos(rx), sX=Math.sin(rx), cY=Math.cos(ry), sY=Math.sin(ry), k=px/100, Rp=R*k, cx=CX*k, cy=CY*k, INF=.4*Math.max(1,px/300);
      for(let i=0;i<n;i++){ const v=V[i]; let x=v[0], y=v[1], z=v[2], w;
        w=y*cX-z*sX; z=y*sX+z*cX; y=w;
        w=x*cY+z*sY; z=-x*sY+z*cY; x=w;
        X3[i]=x; Y3[i]=y; Z3[i]=z; const f=Fp/Math.max(.2,Fp-z); SX[i]=cx+x*f*Rp; SY[i]=cy+y*f*Rp; }
      for(let i=0;i<m;i++){ const tr=T[i]; zk[i]=Z3[tr[0]]+Z3[tr[1]]+Z3[tr[2]]; }
      ord.sort((a,b)=>zk[a]-zk[b]);
      c.setTransform(1,0,0,1,0,0);
      for(let q=0;q<m;q++){ const tr=T[ord[q]], A=tr[0], B=tr[1], C=tr[2];
        const e1x=X3[B]-X3[A], e1y=Y3[B]-Y3[A], e1z=Z3[B]-Z3[A], e2x=X3[C]-X3[A], e2y=Y3[C]-Y3[A], e2z=Z3[C]-Z3[A];
        const nx=e1y*e2z-e1z*e2y, ny=e1z*e2x-e1x*e2z, nz=e1x*e2y-e1y*e2x, nl=Math.hypot(nx,ny,nz)||1;
        const lam=Math.abs((nx*.42+ny*-.55+nz*.72)/nl), s=(1-SH)+SH*(.25+.75*lam);
        const gx=(SX[A]+SX[B]+SX[C])/3, gy=(SY[A]+SY[B]+SY[C])/3;
        c.fillStyle='rgb('+Math.round(PINK[0]*s)+','+Math.round(PINK[1]*s)+','+Math.round(PINK[2]*s)+')';
        c.beginPath();
        [A,B,C].forEach((id,j)=>{ const dx=SX[id]-gx, dy=SY[id]-gy, l=Math.hypot(dx,dy)||1, X=SX[id]+dx/l*INF, Y=SY[id]+dy/l*INF; j?c.lineTo(X,Y):c.moveTo(X,Y); });
        c.closePath(); c.fill(); }
      reset(c,px);
    };
  } },

/* DISPERSION. A, graded still: his 'figures' photo dispersing over 'shore' (the photos this tile already had), PIXEL_FX.dispersion's
   own loop with Embers at 0, so no pixel is mixed toward the orange Ember colour and there is no rim round the holes; Grain 140,
   Travel 90 (its default), Edge .25, Direction 0, on a 1080 frame read S px wide. Travel at its default also keeps the sunset's own
   orange from being dragged into smears. Progress stepped at 15 fps: 0, up to .45 (its default) and held, on to 1, held on the
   shot below, cut back. */
{ id:'dispersion', name:'Dispersion', section:'Opacity / Visibility', isNew:true, still:3.05,
  line:'The layer breaks up into holes whose pieces drift off one way and fade, until only the layer below is left.',
  make(px){
    const P=4.8, S=Math.min(Math.round(px*.55),300), n=S*S, SCALE=140*S/1080, DIST=90*S/1080, SOFT=.25, HOLD=.45;
    const s=photoPixels('figures',S);
    const [BG,bx]=sheet(Math.min(px,420)); bx.imageSmoothingQuality='high'; { const p=photo('shore'); if(p) bx.drawImage(p,0,0,BG.width,BG.width); }
    const inv=1/SCALE, gw=Math.ceil(S*inv)+2;
    const cellN=(cx,cy)=>{ let h=((cy*gw+cx)*374761393)|0; h=(h^(h>>13))*1274126177; h=(h^(h>>16)); return (h&0xffff)/65536; };
    const N=new Float32Array(n);
    for(let y=0,p=0;y<S;y++){ const fy=y*inv, y0=fy|0, ty=fy-y0, sy=ty*ty*(3-2*ty); for(let x=0;x<S;x++,p++){ const fx=x*inv, x0=fx|0, tx=fx-x0, sx=tx*tx*(3-2*tx), a=cellN(x0,y0), b=cellN(x0+1,y0), e=cellN(x0,y0+1), f=cellN(x0+1,y0+1), top=a+(b-a)*sx; N[p]=top+((e+(f-e)*sx)-top)*sy; } }
    const [TM,tx]=sheet(S), buf=tx.createImageData(S,S), d=buf.data;
    return (c,t)=>{
      reset(c,px);
      const T=mod(t,P), q=Math.floor(T*15)/15;
      let pr=0;
      if(q>=.9&&q<1.5) pr=HOLD*E.inOut(seg(q,.9,1.5)); else if(q>=1.5&&q<2.7) pr=HOLD; else if(q>=2.7&&q<3.4) pr=HOLD+(1-HOLD)*E.inOut(seg(q,2.7,3.4)); else if(q>=3.4&&q<4.4) pr=1;
      c.drawImage(BG,0,0,100,100);
      if(pr>=1) return;
      const front=pr*(1+SOFT);
      for(let y=0,p=0;y<S;y++) for(let x=0;x<S;x++,p++){
        const i=p*4, e=pr>0?(front-N[p])/SOFT:0;
        if(e<=0){ d[i]=s[i]; d[i+1]=s[i+1]; d[i+2]=s[i+2]; d[i+3]=255; continue; }
        if(e>=1){ d[i+3]=0; continue; }
        const off=e*e*DIST; let sx=Math.round(x-off); if(sx<0) sx=0;
        const si=(y*S+sx)*4;
        d[i]=s[si]; d[i+1]=s[si+1]; d[i+2]=s[si+2]; d[i+3]=255*(1-e);
      }
      tx.putImageData(buf,0,0);
      c.drawImage(TM,0,0,100,100);
    };
  } }

);
})();
