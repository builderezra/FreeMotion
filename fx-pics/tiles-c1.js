/* FreeMotion effect pictures, artist c1: Colour Balance, Colourize, Colour Wheels, Contrast, Cross Process, Shadow Bloom, Exposure.
   No photographs. Every subject is made here, pixel by pixel, and every grade is the effect's own maths from js/compositor.js, ported
   line for line and run on those pixels. Each draw function carries .truth = {type, params, src, out} so the picture can be checked
   against the app's real renderer on the very same subject. */
(function(){ 'use strict';
const {TAU,clamp,lerp,seg,E,rng}=window.FXK;

const BONE='#e7e2d5', INK='#16130f', COAL='#0c0c0d', NAVY='#161c28', HAIR='#2b3547', TEXT='#eef2f8', DIM='#8b96a8', VERM='#e4471d', YEL='#ffce4a', TEAL='#29d9bb', PAPER='#d9d4c6', CHINA='#d8321f';
const MONO=s=>'bold '+s+'px "Courier Prime","Courier New",monospace';
const mod=(t,P)=>((t%P)+P)%P;
const reset=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; c.imageSmoothingEnabled=true; c.imageSmoothingQuality='high'; };
const sheet=(w,h)=>{ const C=document.createElement('canvas'); C.width=w; C.height=h===undefined?w:h; return [C,C.getContext('2d')]; };
const settle=p=>p<=0?0:p>=1?1:1-Math.pow(2,-8.5*p)*Math.cos(p*9.5);
const sstep=(a,b,x)=>{ const q=clamp((x-a)/(b-a)); return q*q*(3-2*q); };
function tab(c,x,y,txt,s,bg,fg){ c.font=MONO(s); const w=c.measureText(txt).width; c.fillStyle=bg; c.fillRect(x,y,w+s*.9,s*1.5); c.fillStyle=fg; c.textBaseline='middle'; c.textAlign='left'; c.fillText(txt,x+s*.45,y+s*.8); return w+s*.9; }
function diamond(c,x,y,r){ c.beginPath(); c.moveTo(x,y-r); c.lineTo(x+r,y); c.lineTo(x,y+r); c.lineTo(x-r,y); c.closePath(); c.fill(); }

/* lattice noise on an integer hash: deterministic, 0..1 */
const ih=(x,y,s)=>{ let h=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(s|0,982451653))|0; h=Math.imul(h^(h>>>13),1274126177); h^=h>>>16; return (h>>>0)/4294967296; };
function n2(x,y,s){ const xi=Math.floor(x), yi=Math.floor(y), fx=x-xi, fy=y-yi, u=fx*fx*(3-2*fx), v=fy*fy*(3-2*fy), a=ih(xi,yi,s), b=ih(xi+1,yi,s), c=ih(xi,yi+1,s), d=ih(xi+1,yi+1,s); return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v; }
function fbm(x,y,s,o){ let a=0,w=.5,f=1,t=0; for(let i=0;i<o;i++){ a+=w*n2(x*f,y*f,s+i*101); t+=w; w*=.5; f*=2.03; } return a/t; }

/* A picture made pixel by pixel, 2x2 supersampled: fn(x, y, out) in picture units (x 0..100 across, y 0..100*H/W down), out = [r,g,b] 0..255 */
function paint(W,H,fn,ss){ ss=ss||2; const im=new ImageData(W,H), d=im.data, o=[0,0,0], k=100/W, n=ss*ss; let i=0;
  for(let y=0;y<H;y++) for(let x=0;x<W;x++,i+=4){ let r=0,g=0,b=0;
    for(let sy=0;sy<ss;sy++) for(let sx=0;sx<ss;sx++){ fn((x+(sx+.5)/ss)*k,(y+(sy+.5)/ss)*k,o); r+=o[0]; g+=o[1]; b+=o[2]; }
    d[i]=r/n; d[i+1]=g/n; d[i+2]=b/n; d[i+3]=255; }
  return im; }
const dup=im=>new ImageData(new Uint8ClampedArray(im.data),im.width,im.height);
function toC(im){ const [C,x]=sheet(im.width,im.height); x.putImageData(im,0,0); return C; }
/* the plain picture through one of the kernels below, in place on a copy, as the app does it on a Uint8ClampedArray */
function graded(im,g){ const o=dup(im); g(o.data,o.width,o.height); return o; }
/* signed distance to a convex polygon (negative inside), for soft light edges */
function convex(P){ let a=0; for(let i=0;i<P.length;i++){ const p=P[i], q=P[(i+1)%P.length]; a+=p[0]*q[1]-q[0]*p[1]; } const sg=a>0?1:-1;
  const N=P.map((p,i)=>{ const q=P[(i+1)%P.length], ex=q[0]-p[0], ey=q[1]-p[1], L=Math.hypot(ex,ey); return [p[0],p[1],sg*ey/L,-sg*ex/L]; });
  return (x,y)=>{ let m=-1e9; for(const e of N){ const d=(x-e[0])*e[2]+(y-e[1])*e[3]; if(d>m) m=d; } return m; }; }

/* ===== the effects' own maths (js/compositor.js), each at the settings its tile states ===== */

/* PIXEL_FX.colorbalance: +-80 levels at +-100; Affects weights by brightness: Darks (1-L)^2, Mids 1-(2L-1)^2, Lights L^2 (Keep brightness Off) */
function kBalance(red,green,blue,range){ const aR=red/100*80, aG=green/100*80, aB=blue/100*80;
  return d=>{ for(let i=0;i<d.length;i+=4){ if(d[i+3]<=0) continue; let w=1;
    if(range>0){ const L=(.299*d[i]+.587*d[i+1]+.114*d[i+2])/255; w=range===1?(1-L)*(1-L):range===3?L*L:1-(2*L-1)*(2*L-1); }
    d[i]=d[i]+aR*w; d[i+1]=d[i+1]+aG*w; d[i+2]=d[i+2]+aB*w; } }; }
/* PIXEL_FX.colorize, Blend: Tone, Shadow lift 25: tint x (0.25 + 0.75 x luma), mixed in by Amount */
function kColorize(col,amt){ return d=>{ for(let i=0;i<d.length;i+=4){ const L=(.299*d[i]+.587*d[i+1]+.114*d[i+2])/255, f=.25+.75*L;
  let r=col[0]*f, g=col[1]*f, b=col[2]*f; r=r>255?255:r; g=g>255?255:g; b=b>255?255:b;
  d[i]=d[i]+(r-d[i])*amt; d[i+1]=d[i+1]+(g-d[i+1])*amt; d[i+2]=d[i+2]+(b-d[i+2])*amt; } }; }
/* PIXEL_FX.colorwheels: cgPush and cgWheelLUT verbatim (lift, gamma, gain per channel) */
function cgPush(hue,keep){ const h=hue*Math.PI/180, k=2/3, r=k*Math.cos(h), g=k*Math.cos(h-2*Math.PI/3), b=k*Math.cos(h-4*Math.PI/3), y=(.299*r+.587*g+.114*b)*keep; return [r-y,g-y,b-y]; }
function cgLUT(sh,mid,hi,bal,blend,keep){ const e=Math.pow(2,.5-blend), a=e*Math.pow(2,bal/2), b=e*Math.pow(2,-bal/2), ps=cgPush(sh[0],keep), pm=cgPush(mid[0],keep), ph=cgPush(hi[0],keep), out=[], cl=(v,lo,hi2)=>v<lo?lo:v>hi2?hi2:v;
  for(let c=0;c<3;c++){ const L=cl(.3*sh[1]*ps[c]+.25*sh[2],-.49,.49), M=.5*mid[1]*pm[c]+.6*mid[2], g=Math.pow(2,-M), K=cl(.3*hi[1]*ph[c]+.25*hi[2],-.49,.49), lut=new Uint8ClampedArray(256);
    for(let v=0;v<256;v++){ let y=v/255; if(L){ y+=L*Math.pow(1-y,a); y=y<0?0:(y>1?1:y); } if(M) y=Math.pow(y,g); if(K){ y+=K*Math.pow(y,b); y=y<0?0:(y>1?1:y); } lut[v]=y*255; }
    out.push(lut); }
  return out; }
function kWheels(shHue,shAmt,hiHue,hiAmt){ const T=cgLUT([shHue,shAmt,0],[40,0,0],[hiHue,hiAmt,0],0,.5,1), R=T[0], G=T[1], B=T[2];
  return d=>{ if(!shAmt&&!hiAmt) return; for(let i=0;i<d.length;i+=4){ if(d[i+3]===0) continue; d[i]=R[d[i]]; d[i+1]=G[d[i+1]]; d[i+2]=B[d[i+2]]; } }; }
/* Contrast is the canvas filter contrast(k): each channel (v - 0.5) * k + 0.5 */
function kContrast(k){ return d=>{ for(let i=0;i<d.length;i+=4){ for(let q=0;q<3;q++) d[i+q]=((d[i+q]/255-.5)*k+.5)*255; } }; }
/* PIXEL_FX.crossprocess, Film: Slide, Colour cast 100, Curve 100: one table per channel, mixed in by Amount */
function kCross(a){ const cv=(v,l,g)=>{ let x=v/255; x=x+l*Math.sin(x*Math.PI); if(x<0)x=0; return Math.pow(x,g)*255; }, LR=[], LG=[], LB=[];
  for(let v=0;v<256;v++){ LR[v]=cv(v,.10,.90); LG[v]=cv(v,.06,.95); LB[v]=cv(v,-.12,1.10); }
  return d=>{ for(let i=0;i<d.length;i+=4){ if(d[i+3]===0) continue; const r=d[i], g=d[i+1], b=d[i+2]; d[i]=r+(LR[r]-r)*a; d[i+1]=g+(LG[g]-g)*a; d[i+2]=b+(LB[b]-b)*a; } }; }
/* PIXEL_FX.darkglow through glow6 (Smoothness above 1): mask 255 - luma under the Threshold, box blurred Smoothness times, then multiply */
function box(src,tmp,W,H,R){ const div=2*R+1;
  for(let y=0;y<H;y++){ const row=y*W; let sum=0; for(let x=-R;x<=R;x++) sum+=src[row+(x<0?0:(x>=W?W-1:x))];
    for(let x=0;x<W;x++){ tmp[row+x]=sum/div; const ax=x+R+1, sx=x-R; sum+=src[row+(ax>=W?W-1:ax)]-src[row+(sx<0?0:sx)]; } }
  for(let x=0;x<W;x++){ let sum=0; for(let y=-R;y<=R;y++) sum+=tmp[(y<0?0:(y>=H?H-1:y))*W+x];
    for(let y=0;y<H;y++){ src[y*W+x]=sum/div; const ay=y+R+1, sy=y-R; sum+=tmp[(ay>=H?H-1:ay)*W+x]-tmp[(sy<0?0:sy)*W+x]; } } }
function kShadowBloom(amt,thrPct,R,passes){ const thr=thrPct===40?102:thrPct/100*255;
  return (d,W,H)=>{ const N=W*H, M=new Float32Array(N), tmp=new Float32Array(N);
    for(let i=0;i<N;i++){ const i4=i*4; if(d[i4+3]===0) continue; const L=.299*d[i4]+.587*d[i4+1]+.114*d[i4+2]; M[i]=L<thr?255-L:0; }
    for(let n=0;n<passes;n++) box(M,tmp,W,H,R);
    for(let i=0;i<N;i++){ const i4=i*4; let D=M[i]/255*amt; if(D>1) D=1; if(D<=0) continue; d[i4]=d[i4]*(1-D); d[i4+1]=d[i4+1]*(1-D); d[i4+2]=d[i4+2]*(1-D); } }; }
/* PIXEL_FX.exposure, Work in sRGB (the default): every byte x 2^stops */
function kExposure(stops){ const m=Math.pow(2,stops); return d=>{ for(let i=0;i<d.length;i+=4){ d[i]*=m; d[i+1]*=m; d[i+2]*=m; } }; }

/* ===== the subjects ===== */

/* A sheet of white paper folded like a fan, on a slate desk; window light from the left. Strictly neutral, so a colour push shows. */
function paperPic(W,H){
  const th=66*Math.PI/180, sn=Math.sin(th), cs=Math.cos(th), R=rng(23), B=[]; let s=8, lit=true;
  while(s<118){ B.push({b:s,c:(R()-.5)*.06,lit}); s+=lit?7.4+R()*2.6:4.4+R()*1.8; lit=!lit; }
  B.push({b:s,c:0,lit});
  const TM=48, T0=79, AMP=3.4;
  /* which face a point lies on, and how far across it (0 at its left fold, 1 at its right) */
  const face=(sp,tp)=>{ let k=0; while(k<B.length-2&&sp>=B[k+1].b+B[k+1].c*(tp-TM)) k++; const el=B[k].b+B[k].c*(tp-TM), er=B[k+1].b+B[k+1].c*(tp-TM); return [k,el,er]; };
  /* the sheet's near end: a ridge stands higher than a valley, so it ends further up the picture, and the end zigzags */
  const endT=(sp,tp)=>{ const [k,el,er]=face(sp,tp), f=clamp((sp-el)/(er-el)); return T0-AMP*(B[k].lit?f:1-f); };
  const desk=(x,y)=>.165+.05*(fbm(x/16,y/16,3,3)-.5)-.035*(x/100)-.02*(y/62)+(ih(x*37|0,y*37|0,4)-.5)*.012;
  return paint(W,H,(x,y,o)=>{
    const sp=x*sn-y*cs, tp=x*cs+y*sn; let v;
    const e0=B[0].b+B[0].c*(tp-TM);
    if(sp<e0){ v=desk(x,y); }
    else if(tp>endT(sp,tp)){ /* the desk past the end, in the sheet's shadow (the light comes from the upper left) */
      const gap=tp-endT(sp,Math.min(tp,T0-.01)); v=desk(x,y)*(.5+.5*sstep(.4,4.2,gap)); }
    else{
      const [k,el,er]=face(sp,tp), f=clamp((sp-el)/(er-el)), dl=sp-el, dr=er-sp, fall=.05*(1-clamp(tp/100));
      if(B[k].lit){ v=.79+.09*f+fall-.10*Math.exp(-dl/1.1)+.05*Math.exp(-dr/.35); }
      else{ v=.29+.15*f*f+fall*.6-.10*Math.exp(-dr/.32)-.04*Math.exp(-dl/.6); }
      if(k===0) v-=.05*Math.exp(-dl/.5);
      const de=endT(sp,tp)-tp; if(de<.5) v*=.93+.07*de/.5;   /* the cut edge */
      v+=(fbm(x/2.2,y/2.2,9,2)-.5)*.03+(ih(x*41|0,y*41|0,8)-.5)*.014;
    }
    o[0]=o[1]=o[2]=v*255;
  });
}

/* A tailor's wall of thread cones on three birch shelves, lit from the left: many colours at many brightnesses. */
function threadsPic(N){
  const R=rng(311), COLS=[[150,30,35],[205,48,40],[226,112,38],[206,158,52],[232,208,74],[112,122,52],[42,96,62],[30,140,102],[26,114,124],[92,162,212],[42,72,162],[26,36,76],[96,62,142],[122,42,92],[212,112,142],[226,172,160],[236,226,200],[242,242,236],[160,160,166],[56,56,62],[26,26,30],[190,150,110],[110,70,46],[230,122,96]];
  const ROWS=[[3.5,26.5],[36.5,26.5],[69.5,26.5]], cones=[];
  const order=COLS.map((c,i)=>[R(),c]).sort((a,b)=>a[0]-b[0]).map(q=>q[1]); let k=0;
  ROWS.forEach(([top,h],ri)=>{ for(let i=-1;i<7;i++){ cones.push({cx:i*17.4+(ri===1?7.4:-1.2)+(R()-.5)*1.4,top:top+(R()-.5)*.8,h,col:order[k++%order.length]}); } });
  const hwAt=(C,y)=>lerp(4.3,7.9,(y-C.top)/C.h);
  return paint(N,N,(x,y,o)=>{
    for(const C of cones){
      if(y<C.top-3.2||y>C.top+C.h||Math.abs(x-C.cx)>8.2) continue;
      if(y<C.top){ /* the paper tube standing out of the cone */
        const u=(x-C.cx)/1.7; if(Math.abs(u)>1) continue; const s=.62+.38*(Math.sqrt(1-u*u)*.8-u*.3); o[0]=226*s; o[1]=214*s; o[2]=188*s; return; }
      const hw=hwAt(C,y), u=(x-C.cx)/hw; if(Math.abs(u)>1) continue;
      const f=(y-C.top)/C.h, rnd=Math.sqrt(1-u*u);
      let s=.6+.4*(rnd*.82-u*.32)+.09*Math.exp(-Math.pow((u+.38)/.2,2));
      s*=1+.045*Math.sin((x*.9+y*1.7)*6.5)*Math.sin((-x*.9+y*1.7)*6.5)+.025*Math.sin(y*8.5);
      if(f<.05) s*=1.1; if(f>.97) s*=.78;
      o[0]=Math.min(255,C.col[0]*s); o[1]=Math.min(255,C.col[1]*s); o[2]=Math.min(255,C.col[2]*s); return;
    }
    for(const [top,h] of ROWS){ const sy=top+h;   /* the shelf's front edge, and the dark under it */
      if(y>=sy&&y<sy+2.3){ const v=(.74+.05*Math.sin(x*1.3+y)+.05*fbm(x/2,y*3,71,2))*(y<sy+.35?1.12:1); o[0]=196*v; o[1]=160*v; o[2]=118*v; return; }
      if(y>=sy+2.3&&y<sy+4.2){ const v=.32+.5*(y-sy-2.3)/1.9; o[0]=o[1]=56*v; o[2]=58*v; return; } }
    /* the wall, and each cone's soft shadow on it, thrown right */
    let sh=1; for(const C of cones){ const yy=y-.7, xx=x-2.6; if(yy<C.top||yy>C.top+C.h) continue; const d=hwAt(C,yy)-Math.abs(xx-C.cx); if(d>-1.4) sh=Math.min(sh,1-.42*clamp((d+1.4)/2.8)); }
    const v=(.21+.03*fbm(x/9,y/9,72,3))*sh; o[0]=v*255; o[1]=v*252; o[2]=v*246;
  });
}

/* An aerial study of dunes in black and white: long lit windward faces, crisp crests, deep lee shadows. Neutral, so a wheel's colour shows. */
function dunesPic(W,H){
  const a=1.18, ca=Math.cos(a), sa=Math.sin(a);
  return paint(W,H,(x,y,o)=>{
    const w1=fbm(x/44,y/44,11,3), w2=fbm(x/16+3,y/16,12,2);
    /* seen from the air at a slant: ridges further off (the top) sit a little closer together */
    const ph=(x*ca+y*sa)/(8+11*y/68)+1.6*w1+.3*w2, k=Math.floor(ph), s=ph-k;
    const crest=.74+.17*(fbm(k*2.3+x/40,y/34+k,13,2)-.5);
    let v;
    if(s<crest){ const f=s/crest, cast=.05+.17*n2(x/18+k*5,y/18,14);
      /* wind ripples: their own fine field, not the ridges' contours */
      const rip=Math.sin(TAU*((x*.55+y*.84)/1.15+2.6*fbm(x/9,y/9,18,2)));
      v=.57+.25*Math.pow(f,1.5)+.05*(fbm(x/25,y/25,19,2)-.5)+.016*rip*(1-f*.75)*(.4+.6*y/68);
      const inS=1-sstep(cast-.02,cast+.03,f); v=lerp(v,.24+.07*f/cast,inS); }
    else{ const f=(s-crest)/(1-crest); v=.11+.15*f*f; }
    v+=(n2(x*2.6,y*2.6,15)-.5)*.022+(ih(x*45|0,y*45|0,16)-.5)*.01;
    o[0]=o[1]=o[2]=v*255;
  });
}

/* A woodpile seen end on, in shade: sawn faces with rings and cracks, bark, and dark gaps between the logs. */
function woodPic(W,H){
  const Hu=100*H/W, R=rng(17), L=[], CELL=10, grid=new Map(), key=(i,j)=>i*1000+j;
  /* largest logs first, then smaller ones into the gaps; never overlapping */
  for(let r=10.5;r>=2.2;r*=.95){ for(let a=0;a<260;a++){ const x=R()*116-8, y=R()*(Hu+16)-8, rr=r*(.92+.16*R()); let ok=true;
      for(const q of L){ if(Math.hypot(q.x-x,q.y-y)<q.r+rr+.25){ ok=false; break; } }
      if(ok){ const sp=R(), base=sp<.5?[200,164,118]:sp<.75?[176,128,86]:sp<.9?[214,190,150]:[150,138,120], pa=R()*TAU, pd=R()*.28*rr;
        const lg={x,y,r:rr,px:x+Math.cos(pa)*pd,py:y+Math.sin(pa)*pd,base:base.map(v=>v*(.92+.14*R())),birch:sp>=.75&&sp<.9,rings:4+R()*8,crack:R()<.55?[R()*TAU,.12+.2*R(),.55+.3*R()]:null,seed:(R()*1e5)|0};
        L.push(lg); for(let i=Math.floor((x-rr)/CELL);i<=Math.floor((x+rr)/CELL);i++) for(let j=Math.floor((y-rr)/CELL);j<=Math.floor((y+rr)/CELL);j++){ const kk=key(i,j); if(!grid.has(kk)) grid.set(kk,[]); grid.get(kk).push(lg); } } } }
  return paint(W,H,(x,y,o)=>{
    const cell=grid.get(key(Math.floor(x/CELL),Math.floor(y/CELL)))||[]; let lg=null, dist=0;
    for(const q of cell){ const d=Math.hypot(x-q.x,y-q.y); if(d<q.r){ lg=q; dist=d; break; } }
    const light=1-.16*(x+y)/(100+Hu);
    if(!lg){ const v=.13+.05*fbm(x/4,y/4,90,2); o[0]=v*255*light; o[1]=v*205*light; o[2]=v*165*light; return; }
    const d=dist/lg.r, a=Math.atan2(y-lg.y,x-lg.x);
    if(d>.9){ /* bark: birch is white with dark flecks */
      const c=lg.birch?(n2(a*6,d*20,lg.seed)>.62?[52,46,40]:[232,227,214]):[74,55,42], v=(.85+.25*n2(a*9,d*30,lg.seed+1))*light; o[0]=c[0]*v; o[1]=c[1]*v; o[2]=c[2]*v; return; }
    /* the rings grow round the pith, which is never quite in the middle */
    const pr=Math.hypot(x-lg.px,y-lg.py)/lg.r, pa=Math.atan2(y-lg.py,x-lg.px);
    const rr=pr*lg.rings+.3*n2(Math.cos(pa)*1.6+lg.seed%97,Math.sin(pa)*1.6,lg.seed), fr=rr-Math.floor(rr), ring=Math.exp(-Math.pow((fr-.5)/.07,2));
    let v=1-.12*ring;
    if(pr<.28) v*=.91;
    if(d>.78) v*=1-.3*(d-.78)/.12;
    /* one drying check, thin and tapering, from near the pith outward */
    if(lg.crack){ const [ca,c0,c1]=lg.crack; if(pr>c0&&pr<c1){ const wob=ca+.12*Math.sin(pr*9+lg.seed), da=Math.abs(((pa-wob+Math.PI)%TAU+TAU)%TAU-Math.PI)*pr*lg.r, w=.26*(1-(pr-c0)/(c1-c0)); if(da<w) v*=.35+.65*da/w; } }
    v*=1+.035*Math.sin((x*.6+y*.8)*3.4+lg.seed)+.04*(fbm(x/3,y/3,lg.seed,2)-.5);
    o[0]=lg.base[0]*v*light; o[1]=lg.base[1]*v*light; o[2]=lg.base[2]*v*light;
  });
}

/* (art director, ad) Contrast's subject. The woodpile above shared its sawn rings with Polar Coordinates' tree-ring slice and its
   scatter of round slices with Grayscale's citrus, so Contrast now shows this instead: a potter's stack of nested bowls, white
   glaze, black glaze, white again, with a small celadon bowl in front, on a plank against a lime-washed wall. One light from the
   left. The black glaze, the white glaze and the grey wall are the whole tonal range a contrast change spreads or squeezes. */
function bowlsPic(W,H){
  const Hu=100*H/W, [C,x]=sheet(W,H), K=W/100; x.setTransform(K,0,0,K,0,0);
  /* the wall, lit from the left; the plank's top and its front edge */
  const wl=x.createLinearGradient(0,0,100,0); wl.addColorStop(0,'#c4beb2'); wl.addColorStop(.6,'#a9a397'); wl.addColorStop(1,'#8b857a'); x.fillStyle=wl; x.fillRect(0,0,100,Hu);
  const R=rng(41); for(let i=0;i<220;i++){ x.fillStyle=R()<.5?'rgba(255,252,244,.022)':'rgba(40,36,30,.02)'; x.beginPath(); x.arc(R()*100,R()*60,2+R()*7,0,TAU); x.fill(); }
  const top=x.createLinearGradient(0,58,0,71); top.addColorStop(0,'#6f5d4a'); top.addColorStop(1,'#937c62'); x.fillStyle=top; x.fillRect(0,58,100,13);
  x.fillStyle='#4a3c2f'; x.fillRect(0,71,100,Hu-71); x.fillStyle='rgba(255,236,206,.22)'; x.fillRect(0,70.6,100,.6);
  x.strokeStyle='rgba(40,28,18,.35)'; x.lineWidth=.22; for(let k=0;k<9;k++){ const y=59.5+k*1.35+R()*.4; x.beginPath(); x.moveTo(0,y); x.bezierCurveTo(30,y+R()*.8-.4,70,y+R()*.8-.4,100,y+R()*.6-.3); x.stroke(); }
  for(let k=0;k<5;k++){ const y=73.5+k*2.6+R(); x.beginPath(); x.moveTo(0,y); x.bezierCurveTo(35,y+R()-.5,65,y+R()-.5,100,y); x.stroke(); }
  /* cast shadows, to the right of each thing (drawn off the canvas so only the blurred shadow lands) */
  const shadow=(fn,blur,a)=>{ x.save(); x.shadowColor='rgba(28,22,16,'+a+')'; x.shadowBlur=blur*K; x.shadowOffsetX=300*K; x.shadowOffsetY=0; x.translate(-300,0); x.fillStyle='#000'; fn(); x.restore(); };
  shadow(()=>{ x.beginPath(); x.ellipse(70,62.8,29,3.6,0,0,TAU); x.fill(); },2.2,.55);
  shadow(()=>{ x.beginPath(); x.moveTo(62,12); x.lineTo(95,16); x.lineTo(99,60); x.lineTo(72,60); x.closePath(); x.fill(); },6,.22);
  shadow(()=>{ x.beginPath(); x.ellipse(19,67,9,1.7,0,0,TAU); x.fill(); },1.6,.5);
  /* a bowl: rim ellipse (cx, rimY, rx, ry), foot at footY with half-width fw. The inside first, then what sits in it, then the
     outside wall in front of both, then the lit front lip */
  const GLAZE={
    white:{out:[[0,'#cfcabe'],[.26,'#f3f0e9'],[.62,'#cdc8bc'],[1,'#86817a']], inn:[[0,'#8f8a80'],[.55,'#dcd8ce'],[1,'#f1eee7']], lip:'rgba(255,255,250,.9)', spec:.0},
    black:{out:[[0,'#24211e'],[.24,'#55504a'],[.4,'#26231f'],[1,'#0f0e0d']], inn:[[0,'#100f0e'],[.6,'#2a2723'],[1,'#47423b']], lip:'rgba(150,145,136,.85)', spec:.55},
    celadon:{out:[[0,'#7f9389'],[.28,'#a9bcb1'],[.65,'#7d9187'],[1,'#4f5f58']], inn:[[0,'#5e6f67'],[.6,'#93a69b'],[1,'#b5c6bb']], lip:'rgba(230,240,232,.85)', spec:.2}};
  const grad=(x0,x1,stops)=>{ const g=x.createLinearGradient(x0,0,x1,0); for(const s of stops) g.addColorStop(s[0],s[1]); return g; };
  const body=(b)=>{ const {cx,rimY,rx,footY,fw}=b, h=footY-rimY; x.beginPath(); x.moveTo(cx-rx,rimY);
    x.bezierCurveTo(cx-rx,rimY+h*.62,cx-fw*1.5,footY,cx-fw,footY); x.lineTo(cx+fw,footY); x.bezierCurveTo(cx+fw*1.5,footY,cx+rx,rimY+h*.62,cx+rx,rimY); x.closePath(); };
  const bowl=(b,inside)=>{ const G=GLAZE[b.g], {cx,rimY,rx,ry,footY,fw}=b;
    x.fillStyle=grad(cx-rx,cx+rx,G.inn); x.beginPath(); x.ellipse(cx,rimY,rx,ry,0,0,TAU); x.fill();
    x.strokeStyle=G.lip; x.lineWidth=.45; x.beginPath(); x.ellipse(cx,rimY,rx-.2,ry-.2,0,Math.PI,TAU); x.stroke();
    if(inside) inside();
    /* the outside wall, minus the opening */
    x.save(); body(b); x.clip(); x.beginPath(); x.rect(cx-rx-1,rimY-ry-1,2*rx+2,footY-rimY+ry+2); x.ellipse(cx,rimY,rx,ry,0,0,TAU);
    x.fillStyle=grad(cx-rx,cx+rx,G.out); x.fill('evenodd');
    if(G.spec){ x.fillStyle='rgba(255,255,255,'+G.spec+')'; x.beginPath(); x.ellipse(cx-rx*.5,rimY+(footY-rimY)*.42,rx*.06,(footY-rimY)*.3,.18,0,TAU); x.fill(); }
    /* the unglazed foot ring, raw clay */
    x.fillStyle='#b48b66'; x.fillRect(cx-fw-1,footY-1.3,2*fw+2,1.4); x.restore();
    x.strokeStyle=G.lip; x.lineWidth=.5; x.beginPath(); x.ellipse(cx,rimY,rx,ry,0,0,Math.PI); x.stroke(); };
  const B1={g:'white',cx:55,rimY:40,rx:33,ry:8,footY:62.6,fw:14.5}, B2={g:'black',cx:55.6,rimY:29.6,rx:25.5,ry:6.2,footY:50,fw:11}, B3={g:'white',cx:56,rimY:20.8,rx:17,ry:4.4,footY:36.5,fw:7.5};
  bowl(B1,()=>bowl(B2,()=>bowl(B3)));
  bowl({g:'celadon',cx:13.5,rimY:59,rx:9.5,ry:2.5,footY:67.2,fw:4.4});
  x.setTransform(1,0,0,1,0,0);
  const im=x.getImageData(0,0,W,H), d=im.data, G=rng(43);
  for(let i=0;i<d.length;i+=4){ const n=(G()+G()-1)*4; d[i]+=n; d[i+1]+=n; d[i+2]+=n; }
  return im;
}

/* A swimming pool from the deck: white tiles, a chrome ladder, sun caustics on blue water, a lane mark on the floor. */
function poolPic(W,H){
  const ye=x=>27-.17*x, RX=[59,72.5];
  const railX=(i,y)=>{ const x0=RX[i], e=ye(x0); if(y<=e){ const q=clamp((y-(e-14))/14); return x0-2.4*(1-q)*(1-q); } return x0+.07*(y-e)+.28*Math.sin(y*.5+i*1.7)+.12*Math.sin(y*1.3+i); };
  return paint(W,H,(x,y,o)=>{
    const e=ye(x); let r,g,b;
    /* the rails, out of the water and in it */
    for(let i=0;i<2;i++){ const top=ye(RX[i])-14; if(y<top||y>ye(RX[i])+19) continue; const dx=x-railX(i,y); if(Math.abs(dx)>1.15) continue;
      const u=dx/1.15; let v=.6-.24*u+.4*Math.exp(-Math.pow((u+.32)/.22,2))-.22*u*u; v=clamp(v,.08,1);
      if(y<e){ o[0]=v*236; o[1]=v*240; o[2]=v*246; return; }
      const d=y-e, m=.42+.25*clamp(d/18); o[0]=lerp(v*230,60,m); o[1]=lerp(v*240,160,m); o[2]=lerp(v*248,205,m); return; }
    if(y<e-4.2){ const A=x*.986-y*.168, Bq=x*.168+y*.986, ga=(A/3.3)%1, gb=(Bq/3.3)%1;
      const grout=(ga<.075||gb<.075||ga<0||gb<0), n=.96+.04*fbm(x/4,y/4,31,2);
      const v=grout?.72:.905*n; o[0]=v*250; o[1]=v*252; o[2]=v*248; return; }
    if(y<e){ const f=(y-(e-4.2))/4.2, v=f<.68?.94+.03*fbm(x/2,y/2,32,2):lerp(.86,.5,(f-.68)/.32); o[0]=v*252; o[1]=v*248; o[2]=v*238; return; }
    const d=y-e, deep=clamp(d/36);
    r=lerp(84,22,deep); g=lerp(188,104,deep); b=lerp(220,168,deep);
    /* the lane mark on the floor, wobbling through the water */
    const lx=24+.17*(y-ye(24))+.7*Math.sin(y*.55+x*.08), inLane=d>5.2&&Math.abs(x-lx)<2.3, inT=d>5.2&&d<8&&Math.abs(x-lx)<7.5;
    if(inLane||inT){ const m=.38+.3*deep; r=lerp(16,r,m); g=lerp(36,g,m); b=lerp(84,b,m); }
    /* treads */
    for(const td of [6.5,12.5]){ if(Math.abs(d-td-.45*Math.sin(x*.7))<.85&&x>railX(0,y)&&x<railX(1,y)){ r=lerp(r,190,.38); g=lerp(g,225,.38); b=lerp(b,235,.38); } }
    /* the coping's shadow and the rails' shadows on the floor */
    let lite=.68+.32*sstep(3,5.2,d);
    for(let i=0;i<2;i++){ const sx=railX(i,y-5)+3.6; if(d>4&&Math.abs(x-sx)<.9) lite*=.74; }
    const w=fbm(x/13,y/8,21,2), c1=1-Math.abs(2*n2(x/4.4+2.4*w,y/2.8+1.6*w,22)-1), c2=1-Math.abs(2*n2(x/2.9-1.7*w,y/2.0+2.1*w,23)-1);
    const ca=(Math.pow(Math.max(c1,c2),9)*.62+.03)*(.4+.6*sstep(3,5.5,d));
    r=r*lite+165*ca; g=g*lite+236*ca; b=b*lite+250*ca;
    o[0]=r; o[1]=g; o[2]=b;
  });
}

/* A quiet room: a tall window on the left wall, sun across the boards, a chair in the light, a doorway in the back wall. */
function roomPic(W,H){
  const VP=[60,33], patch=convex([[34,57.6],[47.5,56.8],[76,75],[45,75]]), mull=convex([[40.2,57.3],[41.9,57.2],[61.4,75],[58.6,75]]), tran=convex([[35.2,60.9],[49.5,60.1],[50.6,61.6],[36,62.4]]);
  /* the window, on the left wall: its top and sill run to the vanishing point */
  const topY=x=>2+(x-10)*.62, sillY=x=>40-(x-10)*.14, WX0=10, WX1=25;
  return paint(W,H,(x,y,o)=>{
    let r,g,b;
    const wallFloorY=55+(33-x)*.815;
    if(x<33&&y<wallFloorY){ /* the window wall, backlit */
      const ty=topY(x), sy=sillY(x), fw=1.3-.5*(x-WX0)/(WX1-WX0);
      if(x>=WX0&&x<WX1&&y>=ty&&y<sy){ const fy=(y-ty)/(sy-ty);
        const fr=(x<WX0+fw||x>WX1-fw*.8||y<ty+fw||y>sy-fw||Math.abs(x-17.2)<fw*.5||Math.abs(fy-1/3)<.022||Math.abs(fy-2/3)<.022);
        if(fr){ o[0]=40; o[1]=38; o[2]=36; return; }
        const v=222+16*(1-y/40)+6*fbm(x/6,y/6,41,2); o[0]=v*.96; o[1]=v*.985; o[2]=Math.min(255,v*1.02); return; }
      if(x>=WX1&&x<WX1+1.4&&y>=topY(WX1)&&y<sillY(WX1)){ o[0]=150; o[1]=144; o[2]=134; return; }   /* the far jamb catches the light */
      if(x>=WX0-1.2&&x<WX1+1.4&&y>=sy&&y<sy+1.7){ o[0]=138; o[1]=133; o[2]=125; return; }   /* sill */
      const v=44+10*(x/33)+5*fbm(x/8,y/8,42,2)-8*Math.exp(-(33-x)/2); o[0]=v; o[1]=v*.97; o[2]=v*.93; return; }
    if(y<55){ /* the back wall, lit from the window side */
      if(x>=72&&x<85&&y>=17){ const fr=x<73.6||x>83.4||y<18.6; if(fr){ o[0]=96; o[1]=93; o[2]=88; return; } const v=27+6*((y-17)/38); o[0]=v; o[1]=v*.95; o[2]=v*.9; return; }
      let v=92-22*((x-33)/67)-10*Math.exp(-(x-33)/3)-9*Math.exp(-(55-y)/2.4)+4*fbm(x/10,y/10,43,3);
      o[0]=v; o[1]=v*.975; o[2]=v*.94; return; }
    /* the floor: boards running to the vanishing point */
    const xb=VP[0]+(x-VP[0])*(75-VP[1])/(y-VP[1]), pl=Math.floor(xb/7.5), fp=xb/7.5-pl, seam=Math.min(fp,1-fp)*7.5*(y-VP[1])/(75-VP[1]);
    let v=58*(.9+.2*ih(pl,0,44))*(.94+.12*fbm(xb/2,y/1.2,45+pl,2)); if(seam<.22) v*=.6;
    v*=1-.25*Math.exp(-(y-55)/2.2);
    let sun=clamp(.5-patch(x,y)/1.1); sun*=clamp(.5+mull(x,y)/.9); sun*=clamp(.5+tran(x,y)/.9);
    r=v*1.05+(196-58)*sun*(v/58); g=v*.86+(176-50)*sun*(v/58); b=v*.72+(144-42)*sun*(v/58);
    o[0]=r; o[1]=g; o[2]=b;
  });
}

window.FX_TILES.push(

/* COLOUR BALANCE. Broadcast bench: a fan-folded sheet of white paper, and its vectorscope. Red +40, Blue -40 (32 levels each way), and Affects
   stepped All, Darks, Lights. Neutral paper is a dot in the middle of the scope; All moves the whole dot toward red-yellow, Darks and
   Lights smear it, because only part of the tonal range moves. */
{ id:'colorbalance', name:'Colour Balance', section:'Colouring', isNew:true, still:1.3,
  line:'Pushes red, green and blue up or down, across the whole picture or only its darks, mids or lights.',
  make(px){
    const P=5.2, W=Math.min(px,400), PH=66, H=Math.round(W*PH/100), SRC=paperPic(W,H);
    const STATES=[null,0,1,3], NAMES=['BYPASS','ALL','DARKS','LIGHTS'];
    const IM=STATES.map(r=>r===null?SRC:graded(SRC,kBalance(40,0,-40,r))), PIC=IM.map(toC);
    /* the vectorscope at x2 gain: every pixel plotted by its colour difference (Rec.601 Cb across, Cr up), so grey sits in the middle */
    const VS=64, ZM=2, cbcr=(r,g,b)=>[-.169*r-.331*g+.5*b,.5*r-.419*g-.081*b];
    const scope=im=>{ const d=im.data, cnt=new Float32Array(VS*VS), add=(x,y,w)=>{ if(x>=0&&x<VS&&y>=0&&y<VS) cnt[y*VS+x]+=w; };
      for(let i=0;i<d.length;i+=4){ const [cb,cr]=cbcr(d[i],d[i+1],d[i+2]), x=Math.round((cb*ZM/256+.5)*(VS-1)), y=Math.round((.5-cr*ZM/256)*(VS-1)); add(x,y,1); add(x-1,y,.4); add(x+1,y,.4); add(x,y-1,.4); add(x,y+1,.4); }
      const mx=d.length/4/700, [C,x]=sheet(VS), o=x.createImageData(VS,VS), q=o.data;
      for(let i=0;i<cnt.length;i++){ if(!cnt[i]) continue; const a=Math.min(1,Math.pow(cnt[i]/mx,.4)), j=i*4; q[j]=238; q[j+1]=242; q[j+2]=248; q[j+3]=255*a; }
      x.putImageData(o,0,0); return C; };
    const SCO=IM.map(scope);
    /* the six colour directions round the rim (at x2 the 75 % targets themselves sit outside the circle) */
    const SX=80, SY=83.2, SR=13.6, TG=[['R',[191,0,0]],['YL',[191,191,0]],['G',[0,191,0]],['CY',[0,191,191]],['B',[0,0,191]],['MG',[191,0,191]]].map(([n,c])=>{ const [cb,cr]=cbcr(c[0],c[1],c[2]), L=Math.hypot(cb,cr); return [n,cb/L,-cr/L]; });
    const at=u=>u<.7?0:u<1.9?1:u<3.1?2:u<4.4?3:0;
    const draw=(c,t)=>{
      const u=mod(t,P), s=at(u); reset(c,px);
      c.fillStyle='#000'; c.fillRect(0,0,100,100);
      c.drawImage(PIC[s],0,0,100,PH);
      /* graticule: the circle, the axes, a tick and a name at each colour's direction */
      c.strokeStyle='#3a3f48'; c.lineWidth=.4; c.beginPath(); c.arc(SX,SY,SR,0,TAU); c.moveTo(SX-SR,SY); c.lineTo(SX+SR,SY); c.moveTo(SX,SY-SR); c.lineTo(SX,SY+SR); c.stroke();
      c.font=MONO(2.6); c.textAlign='center'; c.textBaseline='middle'; c.fillStyle='#5b6170'; c.strokeStyle='#5b6170';
      for(const [n,ux,uy] of TG){ c.beginPath(); c.moveTo(SX+ux*(SR-1.6),SY+uy*(SR-1.6)); c.lineTo(SX+ux*SR,SY+uy*SR); c.stroke(); c.fillText(n,SX+ux*(SR+2.6),SY+uy*(SR+2.6)); }
      c.drawImage(SCO[s],SX-SR,SY-SR,2*SR,2*SR);
      c.textAlign='right'; c.fillStyle=DIM; c.fillText('X2',SX+SR+3.2,SY+SR+.4);
      c.textAlign='left';
      c.font=MONO(3.4); c.fillStyle=DIM; c.fillText('AFFECTS',4,73.2);
      c.font=MONO(7.4); c.fillStyle=s?TEXT:DIM; c.fillText(NAMES[s],4,81);
      c.font=MONO(3.4); c.fillStyle=DIM; c.fillText('RED +40  BLUE -40',4,92.6);
    };
    draw.truth={type:'colorbalance',params:{red:40,green:0,blue:-40,range:0},src:toC(SRC),out:PIC[1]};
    return draw;
  } },

/* COLOURIZE. Graded still: a wall of thread cones. Blend Tone, Shadow lift 25: every pixel becomes the Colour at its own brightness.
   Amount travels 0 to 1, the swatch cuts from the default blue to vermilion, and back. Crossfading the plain picture into Amount 1 is the
   effect's own mix, so every in-between frame is exact. */
{ id:'colorize', name:'Colourize', section:'Colouring', isNew:true, still:1.8,
  line:'Every colour in the picture becomes a shade of the one colour you pick, as light or dark as the original was.',
  make(px){
    const P=4.6, N=Math.min(px,360), SRC=threadsPic(N), A=toC(SRC), SW=[[58,160,255],[228,71,29]], HEX=['3AA0FF','E4471D'];
    const OUT=SW.map(col=>toC(graded(SRC,kColorize(col,1))));
    const draw=(c,t)=>{
      const u=mod(t,P), f=Math.floor(u*12)/12;
      const amt=f<.7?0:f<1.15?E.inOut(seg(f,.7,1.15)):f<3.8?1:f<4.2?1-E.inOut(seg(f,3.8,4.2)):0, k=u<2.5?0:1;
      reset(c,px); c.drawImage(A,0,0,100,100);
      if(amt>0){ c.globalAlpha=amt; c.drawImage(OUT[k],0,0,100,100); c.globalAlpha=1;
        c.fillStyle=INK; c.fillRect(3,88.6,27.6,8.4); c.fillStyle='rgb('+SW[k].join(',')+')'; c.fillRect(4.5,90.1,5.4,5.4);
        c.font=MONO(4.6); c.fillStyle=BONE; c.textBaseline='middle'; c.textAlign='left'; c.fillText(HEX[k],11.3,92.9); }
    };
    draw.truth={type:'colorize',params:{amount:1,color:'#3aa0ff'},src:A,out:OUT[0]};
    return draw;
  } },

/* COLOUR WHEELS. Viewer overlay: an aerial dune study in black and white. The Shadows wheel's puck goes to Hue 190 at Amount 80, then the
   Highlights puck to Hue 35 at Amount 70 (the effect's own default hues); the picture is cgWheelLUT at every step. Keep brightness 100. */
{ id:'colorwheels', name:'Colour Wheels', section:'Colouring', isNew:true, still:3.0,
  line:'Three wheels tint the shadows, the midtones and the highlights on their own: here teal shadows under warm highlights.',
  make(px){
    const P=5.0, W=Math.min(px,400), H=Math.round(W*.68), SRC=dunesPic(W,H), SH=190, HI=35, SA=.8, HA=.7;
    /* the grade is the real three tables, rebuilt only when a puck has moved: 768 entries, then one lookup per channel */
    const [OC,ox]=sheet(W,H), OUT=new ImageData(W,H), s=SRC.data, o=OUT.data; let last='';
    const grade=(a,b)=>{ const key=a.toFixed(3)+'|'+b.toFixed(3); if(key===last) return; last=key; const T=cgLUT([SH,a,0],[40,0,0],[HI,b,0],0,.5,1), R=T[0], G=T[1], B=T[2];
      for(let i=0;i<s.length;i+=4){ o[i]=R[s[i]]; o[i+1]=G[s[i+1]]; o[i+2]=B[s[i+2]]; o[i+3]=255; } ox.putImageData(OUT,0,0); };
    const WX=[20,50,80], WY=81.5, WR=8.2, LAB=['SHADOWS','MIDTONES','HIGHLIGHTS'];
    const draw=(c,t)=>{
      const u=mod(t,P);
      const ps=u<.5?0:u<1.3?settle(seg(u,.5,1.3)):u<3.9?1:u<4.5?1-E.inOut(seg(u,3.9,4.5)):0;
      const ph=u<1.5?0:u<2.3?settle(seg(u,1.5,2.3)):u<3.9?1:u<4.5?1-E.inOut(seg(u,3.9,4.5)):0;
      grade(clamp(SA*ps),clamp(HA*ph));
      reset(c,px); c.fillStyle=NAVY; c.fillRect(0,0,100,100);
      const X=3, Y=3, PW=94, PH=PW*H/W;
      c.drawImage(OC,X,Y,PW,PH);
      c.fillStyle=HAIR; c.fillRect(X-.5,Y+PH+.4,PW+1,.5);
      const amt=[SA*ps,0,HA*ph], hue=[SH,0,HI];
      for(let k=0;k<3;k++){ const cx=WX[k], cy=WY;
        c.strokeStyle=DIM; c.lineWidth=.5; c.beginPath(); c.arc(cx,cy,WR,0,TAU); c.stroke();
        c.beginPath(); c.moveTo(cx-1.6,cy); c.lineTo(cx+1.6,cy); c.moveTo(cx,cy-1.6); c.lineTo(cx,cy+1.6); c.stroke();
        const a=-hue[k]*Math.PI/180, r=amt[k]*WR, qx=cx+Math.cos(a)*r, qy=cy+Math.sin(a)*r;
        if(k!==1){ c.fillStyle=YEL; const tr=(k===0?SA:HA)*WR; diamond(c,cx+Math.cos(a)*tr,cy+Math.sin(a)*tr,1.5); }
        if(r>.3){ c.strokeStyle=TEAL; c.lineWidth=.6; c.beginPath(); c.moveTo(cx,cy); c.lineTo(qx,qy); c.stroke(); }
        c.fillStyle=TEAL; c.fillRect(qx-1.25,qy-1.25,2.5,2.5);
        c.font=MONO(3.3); c.fillStyle=amt[k]>.01?TEXT:DIM; c.textAlign='center'; c.textBaseline='middle'; c.fillText(LAB[k],cx,95.2);
      }
      c.textAlign='left';
    };
    draw.truth={type:'colorwheels',params:{sh_hue:SH,sh_amt:SA*100,hi_hue:HI,hi_amt:HA*100},src:toC(SRC),out:toC(graded(SRC,kWheels(SH,SA,HI,HA)))};
    return draw;
  } },

/* CONTRAST. A print of a potter's stacked bowls on the bench (the woodpile it showed first repeated other tiles' subjects: see
   bowlsPic). contrast(k) on every pixel, stepped like a colourist's A/B: 1.00, the default 1.30, 1.70, then 0.70, which goes flat. */
{ id:'contrast', name:'Contrast', section:'Colouring', isNew:true, still:2.0,
  line:'Darks get darker and lights get lighter; below 1 the picture goes flat and grey.',
  make(px){
    const P=4.6, X=6.5, Y=6.5, PW=87, PH=75, W=Math.min(px,380), H=Math.round(W*PH/PW), SRC=bowlsPic(W,H);
    const K=[1,1.3,1.7,.7], PIC=K.map(k=>k===1?toC(SRC):toC(graded(SRC,kContrast(k))));
    const at=u=>u<.6?0:u<1.4?1:u<3.0?2:u<3.8?3:0;
    const draw=(c,t)=>{
      const u=mod(t,P), s=at(u); reset(c,px);
      c.fillStyle=COAL; c.fillRect(0,0,100,100);
      c.fillStyle='#efede6'; c.fillRect(X-2.6,Y-2.6,PW+5.2,PH+5.2);
      c.drawImage(PIC[s],X,Y,PW,PH);
      c.font=MONO(4.6); c.textBaseline='middle'; c.textAlign='left'; c.fillStyle=DIM; c.fillText('CONTRAST',X-2.6,93);
      c.font=MONO(6.4); c.fillStyle=TEXT; c.textAlign='right'; c.fillText(K[s].toFixed(2),X+PW+2.6,93.2); c.textAlign='left';
    };
    draw.truth={type:'contrast',params:{amount:1.7},src:PIC[0],out:PIC[2]};
    return draw;
  } },

/* CROSS PROCESS. A 35 mm slide on a lightbox, marked X-PRO in chinagraph. Film: Slide, Amount 0.8: the effect's three channel curves,
   crossfaded in from the plain frame (Amount is the effect's own linear mix, so the in-between frames are exact). */
{ id:'crossprocess', name:'Cross Process', section:'Colouring', isNew:true, still:2.0,
  line:'Shifts the colours like slide film developed in the wrong chemicals: whites turn yellow and blues turn teal.',
  make(px){
    const P=4.4, AMT=.8, W=Math.min(px,400), H=Math.round(W*2/3), SRC=poolPic(W,H), A=toC(SRC), FULL=toC(graded(SRC,kCross(1)));
    const ANG=-3.4*Math.PI/180, S=114, AW=82.5, AH=55, AX=(S-AW)/2, AY=(S-AH)/2-1.6, MX=4-AX, MY=7-AY;
    const R=rng(5), jit=()=>(R()-.5)*.07;
    const GL={X:[[[0,0],[.66,1]],[[.68,0],[.02,1]]], '-':[[[.02,.56],[.42,.53]]], P:[[[0,1],[0,0],[.42,0],[.62,.12],[.63,.36],[.43,.5],[0,.5]]], R:[[[0,1],[0,0],[.42,0],[.62,.12],[.62,.35],[.42,.47],[0,.48]],[[.3,.48],[.7,1]]], O:[Array.from({length:15},(_,i)=>{ const a=-Math.PI/2+i/14*TAU*1.04; return [.34+.34*Math.cos(a),.5+.5*Math.sin(a)]; })]};
    const STROKES=[]; let ax=0; for(const ch of 'X-PRO'){ for(const pl of GL[ch]) STROKES.push(pl.map(p=>[ax+p[0]+jit()+(1-p[1])*.16,p[1]+jit()])); ax+=ch==='-'?.62:.86; }
    const [LB,lb]=sheet(Math.round(px/4)); { const im=lb.createImageData(LB.width,LB.height); for(let i=0;i<im.data.length;i+=4){ const v=242+((ih(i,7,3)*5)|0); im.data[i]=v; im.data[i+1]=v-1; im.data[i+2]=v-5; im.data[i+3]=255; } lb.putImageData(im,0,0); }
    const draw=(c,t)=>{
      const u=mod(t,P), a=u<.7?0:u<1.25?E.inOut(seg(u,.7,1.25)):u<3.4?1:u<3.95?1-E.inOut(seg(u,3.4,3.95)):0;
      reset(c,px); c.drawImage(LB,0,0,100,100);
      c.translate(MX,MY); c.rotate(ANG);
      c.drawImage(A,AX,AY,AW,AH);
      if(a>0){ c.globalAlpha=a*AMT; c.drawImage(FULL,AX,AY,AW,AH); c.globalAlpha=1; }
      /* the mount: backlit plastic, a hole with rounded corners */
      c.fillStyle='#b8b2a3'; c.beginPath(); c.rect(0,0,S,S); c.roundRect(AX,AY,AW,AH,2.2); c.fill('evenodd');
      c.strokeStyle='#9d9789'; c.lineWidth=.9; c.beginPath(); c.roundRect(AX-.45,AY-.45,AW+.9,AH+.9,2.4); c.stroke();
      c.fillStyle='#8a8478'; c.font=MONO(3.8); c.textBaseline='middle'; c.textAlign='left'; c.fillText('12A',AX+1,AY+AH+5.2);
      c.strokeStyle=CHINA; c.lineWidth=1.25; c.lineCap='round'; c.lineJoin='round';
      const SX=AX+27, SY=AY+AH+8.8, SC=8.4;
      for(const pl of STROKES){ c.beginPath(); pl.forEach((p,i)=>{ const x=SX+p[0]*SC*.82, y=SY+p[1]*SC; i?c.lineTo(x,y):c.moveTo(x,y); }); c.stroke(); }
      reset(c,px);
    };
    draw.truth={type:'crossprocess',params:{amount:AMT},src:A,out:toC(graded(SRC,kCross(AMT)))};
    return draw;
  } },

/* SHADOW BLOOM. Cut paper: a cast-iron kettle, scissor cut, on bone in front of a vermilion panel. Amount 0.75, Threshold 40
   (default), Radius 60 px of a 1080 frame (the slider runs 1-80), Smoothness 3: the black spreads a soft shadow into the paper round it,
   and the light inside the handle's loop and under the spout is the first to go. The vermilion is above the threshold, so it only
   receives the shadow. Amount steps on threes; output is the effect's multiply, crossfaded from Amount 1 (exact, it is linear in Amount). */
{ id:'darkglow', name:'Shadow Bloom', section:'Colouring', isNew:true, still:2.0,
  line:'The dark parts of the picture spread a soft shadow into the lighter areas around them.',
  make(px){
    const P=4.0, N=px, [S,sx]=sheet(N); sx.setTransform(N/100,0,0,N/100,0,0);
    const poly=(p,col)=>{ sx.fillStyle=col; sx.beginPath(); p.forEach((q,i)=>i?sx.lineTo(q[0],q[1]):sx.moveTo(q[0],q[1])); sx.closePath(); sx.fill(); };
    /* scissor cut: a curve is a run of straight snips, each a touch off true */
    const R=rng(61), arc=(cx,cy,rx,ry,a0,a1,n,j)=>{ const o=[]; for(let i=0;i<=n;i++){ const a=a0+(a1-a0)*i/n, k=1+(R()-.5)*(j||0); o.push([cx+Math.cos(a)*rx*k,cy+Math.sin(a)*ry*k]); } return o; };
    poly([[0,0],[100,0],[100,100],[0,100]],BONE);
    poly([[60.5,0],[100,0],[100,79.6],[57.4,80.4]],VERM);
    /* the table's front edge, a degree off level */
    poly([[0,80.2],[100,79.1],[100,80.5],[0,81.6]],INK);
    /* the kettle: a squat body, a low lid and knob, a spout reaching up to the left, a bail handle arching over the top */
    const BX=36, BY=63;
    poly([...arc(BX,BY,24,17.5,Math.PI*.93,Math.PI*2.07,14,.03),[BX+21,79.9],[BX-21.5,80.3]],INK);
    poly(arc(BX,BY-15.4,10.5,4.2,Math.PI,Math.PI*2,6,0).concat([[BX+10.5,BY-14.2],[BX-10.5,BY-14.2]]),INK);
    poly([[BX-1.8,BY-19.3],[BX+1.9,BY-19.5],[BX+1.6,BY-22.6],[BX-1.5,BY-22.4]],INK);
    poly([[BX-21.4,BY-1.5],[BX-19.6,BY+6.8],[BX-31.2,BY-13.2],[BX-33.4,BY-12.2]],INK);
    poly([[BX-34.6,BY-14.6],[BX-30.4,BY-15.6],[BX-30.6,BY-12.9],[BX-34.2,BY-11.9]],INK);
    const HR=23, HW=2.6, A0=Math.PI*1.08, A1=Math.PI*1.92, HY=BY-6;
    poly([...arc(BX,HY,HR,HR*1.02,A0,A1,10,.012),...arc(BX,HY,HR-HW,(HR-HW)*1.02,A1,A0,10,0)],INK);
    for(const a of [A0,A1]){ const x=BX+Math.cos(a)*(HR-HW/2), y=HY+Math.sin(a)*(HR-HW/2); poly([[x-2.2,y-1],[x+2.2,y-1.4],[x+2.4,y+3.6],[x-2,y+3.9]],INK); }
    /* cut-outs in the iron: the lid's seam and one long highlight down the shoulder */
    poly([[BX-10.4,BY-14.4],[BX+10.4,BY-14.6],[BX+10.3,BY-13.8],[BX-10.3,BY-13.6]],BONE);
    poly([...arc(BX,BY,20.5,14,Math.PI*1.12,Math.PI*1.38,4,0),...arc(BX,BY,18.6,12.2,Math.PI*1.38,Math.PI*1.14,4,0)],BONE);
    sx.setTransform(1,0,0,1,0,0);
    const AMT=.75, RAD=60, im=sx.getImageData(0,0,N,N), Rp=Math.max(1,Math.round(RAD*N/1080)), FULL=toC(graded(im,kShadowBloom(1,40,Rp,3)));
    const draw=(c,t)=>{
      const u=mod(t,P), f=Math.floor(u*8)/8;
      const amt=f<.75?0:f<1.25?AMT*Math.min(1,(f-.75+.125)/.5):f<3.25?AMT:f<3.75?AMT*Math.max(0,1-(f-3.25+.125)/.5):0;
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.drawImage(S,0,0,px,px);
      if(amt>0){ c.globalAlpha=amt; c.drawImage(FULL,0,0,px,px); c.globalAlpha=1; }
    };
    draw.truth={type:'darkglow',params:{amount:AMT,radius:RAD,passes:3},src:S,out:toC(graded(im,kShadowBloom(AMT,40,Rp,3)))};
    return draw;
  } },

/* EXPOSURE. A quiet room with a window, under a camera's exposure scale. Work in sRGB (the default): every byte x 2^Stops. The dial clicks
   in thirds of a stop, 0 to +1 1/3 (the window and the sun on the boards clip to white), down to -1, and home. */
{ id:'exposure', name:'Exposure', section:'Colouring', isNew:true, still:1.5,
  line:'Brightens or darkens the whole picture in stops, like a camera; push it up and the brightest parts clip to white.',
  make(px){
    const P=4.4, W=Math.min(px,400), H=Math.round(W*.74), SRC=roomPic(W,H);
    const ST=[]; for(let k=-3;k<=4;k++) ST.push(k);   /* thirds of a stop */
    const PIC=ST.map(k=>k===0?toC(SRC):toC(graded(SRC,kExposure(k/3))));
    /* the dial: holds and clicks, one third every 2 frames at 25 fps */
    const third=u=>u<.62?0:u<2.0?Math.min(4,Math.floor((u-.62)/.08)+1):u<3.2?Math.max(-3,3-Math.floor((u-2.0)/.08)):Math.min(0,-2+Math.floor((u-3.2)/.08));
    const draw=(c,t)=>{
      const u=mod(t,P), k=third(u); reset(c,px);
      c.fillStyle=INK; c.fillRect(0,0,100,100);
      c.drawImage(PIC[k+3],0,0,100,74);
      /* the scale: -2 to +2 in thirds */
      const S0=24, S1=94, sy=86.5, xOf=v=>lerp(S0,S1,(v+6)/12);
      c.fillStyle=DIM; for(let i=-6;i<=6;i++){ const big=i%3===0; c.fillRect(xOf(i)-.2,sy-(big?2.6:1.3),.4,big?2.6:1.3); }
      c.fillRect(S0,sy,S1-S0,.35);
      c.font=MONO(3.6); c.textAlign='center'; c.textBaseline='middle'; c.fillStyle=DIM;
      ['-2','-1','0','+1','+2'].forEach((s,i)=>c.fillText(s,xOf(-6+i*3),sy+4.4));
      const mx=xOf(k); c.fillStyle=YEL; c.beginPath(); c.moveTo(mx,sy-3.2); c.lineTo(mx+1.9,sy-6.2); c.lineTo(mx-1.9,sy-6.2); c.closePath(); c.fill();
      const val=k/3; c.font=MONO(6.2); c.textAlign='left'; c.fillStyle=TEXT; c.fillText((val>0?'+':val<0?'-':' ')+Math.abs(val).toFixed(1),3,86.6);
      c.font=MONO(3.6); c.fillStyle=DIM; c.fillText('EV',3,92.4);
    };
    draw.truth={type:'exposure',params:{stops:4/3},src:PIC[3],out:PIC[7]};
    return draw;
  } }

);
})();
