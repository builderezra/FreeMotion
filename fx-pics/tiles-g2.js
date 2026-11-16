/* FreeMotion effect pictures, g2: Sharpen and Soften Skin, redrawn after his review of the preview.
   Both are graded stills (direction A). Nothing here is a photograph: each subject is painted here at a fixed number of frame pixels,
   and the effect is the app's own kernel from js/compositor.js, ported line for line and run on those pixels in make(). Each tile's
   _proof() hands back the painted pixels and our result, so truth.html can run FM._pixelFx on the same pixels and compare. */
(function(){ 'use strict';
const {TAU,clamp,lerp,seg,E,rng,hash,vnoise,canvasOf,photo,photoCover}=window.FXK;

const BONE='#e7e2d5';
const mod=(t,P)=>((t%P)+P)%P;
const reset=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; c.imageSmoothingEnabled=true; c.imageSmoothingQuality='high'; };
const sheet=(w,h)=>{ const C=document.createElement('canvas'); C.width=w; C.height=h===undefined?w:h; return [C,C.getContext('2d',{willReadFrequently:true})]; };
const sstep=(a,b,x)=>{ const u=x<=a?0:x>=b?1:(x-a)/(b-a); return u*u*(3-2*u); };
const G=(x,y,cx,cy,sx,sy)=>{ const a=(x-cx)/sx, b=(y-cy)/sy; return Math.exp(-.5*(a*a+b*b)); };
const toCanvas=(W,H,data)=>{ const C=document.createElement('canvas'); C.width=W; C.height=H; const x=C.getContext('2d'); const im=x.createImageData(W,H); im.data.set(data); x.putImageData(im,0,0); return C; };
/* a smooth 2-D value noise, 0..1 */
function vn2(x,y,s){ const xi=Math.floor(x), yi=Math.floor(y), fx=x-xi, fy=y-yi, ux=fx*fx*(3-2*fx), uy=fy*fy*(3-2*fy);
  const h=(a,b)=>hash(((a*73856093)^(b*19349663))%100003,s); return lerp(lerp(h(xi,yi),h(xi+1,yi),ux),lerp(h(xi,yi+1),h(xi+1,yi+1),ux),uy); }

/* ---- the app's own blur, verbatim: boxesForGauss (compositor.js 2906) and e1BoxBlur (25409) ---- */
function boxesForGauss(sigma){ const n=3, wIdeal=Math.sqrt(12*sigma*sigma/n+1); let wl=Math.floor(wIdeal); if(wl%2===0) wl--;
  const m=Math.round((12*sigma*sigma-n*wl*wl-4*n*wl-3*n)/(-4*wl-4)); const out=[]; for(let i=0;i<n;i++) out.push(Math.max(0,((i<m?wl:wl+2)-1)/2)); return out; }
function e1BoxBlur(src,W,H,sigma){
  let a=new Uint8ClampedArray(src), b=new Uint8ClampedArray(src.length);
  const pass=(from,to,r,horiz)=>{ const len=horiz?W:H, lines=horiz?H:W, step=horiz?4:W*4, w=2*r+1;
    for(let l=0;l<lines;l++){ const base=horiz?l*W*4:l*4;
      for(let c=0;c<4;c++){ let acc=0; for(let k=-r;k<=r;k++) acc+=from[base+Math.min(len-1,Math.max(0,k))*step+c];
        for(let x=0;x<len;x++){ to[base+x*step+c]=(acc+(w>>1))/w; const add=Math.min(len-1,x+r+1), sub=Math.max(0,x-r); acc+=from[base+add*step+c]-from[base+sub*step+c]; } } } };
  boxesForGauss(Math.max(0.5,sigma)).forEach(r=>{ r=Math.round(r); if(r<1) return; pass(a,b,r,true); pass(b,a,r,false); });
  return a; }
/* the same three boxes on one float channel: for masks and heights while painting (not part of any effect) */
function blurF(src,W,H,sigma){ let a=Float32Array.from(src), b=new Float32Array(src.length);
  const pass=(from,to,r,horiz)=>{ const len=horiz?W:H, lines=horiz?H:W, step=horiz?1:W, w=2*r+1;
    for(let l=0;l<lines;l++){ const base=horiz?l*W:l; let acc=0; for(let k=-r;k<=r;k++) acc+=from[base+Math.min(len-1,Math.max(0,k))*step];
      for(let x=0;x<len;x++){ to[base+x*step]=acc/w; acc+=from[base+Math.min(len-1,x+r+1)*step]-from[base+Math.max(0,x-r)*step]; } } };
  boxesForGauss(Math.max(.5,sigma)).forEach(r=>{ r=Math.round(r); if(r<1) return; pass(a,b,r,true); pass(b,a,r,false); });
  return a; }

/* ---- PIXEL_FX.softskin, its default path (Soften: Everything, Brighten 0, Show selection Off), compositor.js 25431 ---- */
function softSkinFx(d,W,H,amount,radius,keep){
  const o=new Uint8ClampedArray(d);
  if(amount<=0) return o;
  const thr=4+(100-keep)*0.9;
  const pm=new Uint8ClampedArray(d.length);
  for(let i=0;i<d.length;i+=4){ const a=d[i+3]; if(a===0) continue; const f=a/255; pm[i]=d[i]*f; pm[i+1]=d[i+1]*f; pm[i+2]=d[i+2]*f; pm[i+3]=a; }
  const bl=e1BoxBlur(pm,W,H,radius/2);
  for(let i=0;i<d.length;i+=4){
    const a=d[i+3]; if(a===0) continue;
    const ba=bl[i+3]; if(ba<1) continue;
    const k=255/ba, br=Math.min(255,bl[i]*k), bg=Math.min(255,bl[i+1]*k), bb2=Math.min(255,bl[i+2]*k);
    const r=d[i], g=d[i+1], b=d[i+2];
    const dl=Math.abs((0.299*r+0.587*g+0.114*b)-(0.299*br+0.587*bg+0.114*bb2));
    const w=amount*(1-sstep(0,thr,dl));
    if(w<=0) continue;
    o[i]=r+(br-r)*w; o[i+1]=g+(bg-g)*w; o[i+2]=b+(bb2-b)*w;
  }
  return o; }

/* ---- PIXEL_FX.sharpen, its Colour path with Skip flat areas 0 and Halos Both, compositor.js 9235: every tap clamps to the frame ---- */
function sharpenFx(s,W,H,amt,r){
  const d=new Uint8ClampedArray(s);
  for(let y=0;y<H;y++){ const yu=(y-r<0?0:y-r)*W, yd=(y+r>H-1?H-1:y+r)*W, yc=y*W;
    for(let x=0;x<W;x++){ const i=(yc+x)*4, iu=(yu+x)*4, id=(yd+x)*4, il=(yc+(x-r<0?0:x-r))*4, ir=(yc+(x+r>W-1?W-1:x+r))*4;
      for(let c=0;c<3;c++) d[i+c]=s[i+c]*(1+4*amt)-(s[iu+c]+s[id+c]+s[il+c]+s[ir+c])*amt; } }
  return d; }

/* ---- curves ---- */
function catmull(pts,per){ const out=[], n=pts.length;
  for(let i=0;i<n-1;i++){ const p0=pts[Math.max(0,i-1)], p1=pts[i], p2=pts[i+1], p3=pts[Math.min(n-1,i+2)];
    for(let k=0;k<per;k++){ const t=k/per, t2=t*t, t3=t2*t;
      out.push([.5*(2*p1[0]+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),
                .5*(2*p1[1]+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)]); } }
  out.push(pts[n-1].slice()); return out; }
function resample(poly,n){ const L=[0]; for(let i=1;i<poly.length;i++) L.push(L[i-1]+Math.hypot(poly[i][0]-poly[i-1][0],poly[i][1]-poly[i-1][1]));
  const tot=L[L.length-1], out=[]; let j=0;
  for(let k=0;k<n;k++){ const s=tot*k/(n-1); while(j<L.length-2&&L[j+1]<s) j++; const f=(s-L[j])/((L[j+1]-L[j])||1); out.push([lerp(poly[j][0],poly[j+1][0],f),lerp(poly[j][1],poly[j+1][1],f)]); }
  return out; }
const polyPath=(c,pts)=>{ c.beginPath(); pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1])); c.closePath(); };
const linePath=(c,pts)=>{ c.beginPath(); pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1])); };
const bez=(p0,p1,p2,p3,t)=>{ const a=1-t; return [a*a*a*p0[0]+3*a*a*t*p1[0]+3*a*t*t*p2[0]+t*t*t*p3[0], a*a*a*p0[1]+3*a*a*t*p1[1]+3*a*t*t*p2[1]+t*t*t*p3[1]]; };
/* a soft shape: the path's fill, blurred by the canvas' own shadow (the shape is drawn off the sheet, only its shadow lands).
   T maps painting units to sheet pixels: x_px = (x - T.X0) * T.K. */
function softFill(c,T,pathFn,blurU,color,op){ const OFF=T.S*4;
  c.save(); c.setTransform(T.K,0,0,T.K,OFF-T.X0*T.K,-T.Y0*T.K); c.globalCompositeOperation=op||'source-over';
  c.shadowColor=color; c.shadowBlur=blurU*T.K*2; c.shadowOffsetX=-OFF; c.shadowOffsetY=0; c.fillStyle='#000'; pathFn(c); c.fill(); c.restore(); }

/* ====================================================================================================================== */
/* SOFTEN SKIN. A close-up: the same painted portrait, its face 765 frame px wide in a 1080 frame, and the tile a SK_W = 280 px square
   of it, 15 "face units" across (the face is 41 wide at the cheekbones; 18.7 frame px to the unit). The near eye runs along the top
   edge, its lashes cut by the frame; the under-eye and the cheek fill the rest. The skin is lit per pixel from a sculpted height map (one soft key up
   and to the left of the camera, a little fill, warm light under the skin where the shadow begins) with its own mottling and
   freckles, and, at this distance, what a close lens resolves (closeSkin): pores, the fine bump of the surface, a faint line under
   the eye, blotchy redness and a few blemishes. The eye is drawn over it, then a camera's slight softness over everything. Then
   PIXEL_FX.softskin at full strength: Amount 1 and Smoothing size 20 px (both controls at their maximum), Keep detail 30, Soften:
   Everything, on every pixel, exactly as the app runs it. (At its defaults, 0.85 / 10 px / 50, on the head-and-shoulders view this
   tile used to show, the face moved about 4 levels: nothing a 77 px picture can show.) */
const SK_W=280, SK_AMOUNT=1, SK_RADIUS=20, SK_KEEP=30, SK_Z=100/15, SK_CX=59.7, SK_CY=45.7;

/* proportions (face units): hairline 17, brows 35, eyes 41, nose base 55, mouth 62.8, chin 74; the head turned a little to the
   left, so the far (left) half of everything is a touch narrower than the near half */
function facePath(c){ c.beginPath();
  c.moveTo(31.0,16);
  c.bezierCurveTo(29.6,26,29.6,36,30.4,44);
  c.bezierCurveTo(30.6,51,32.2,58.5,35.4,64.0);
  c.bezierCurveTo(38.6,69.2,43.2,73.2,48.6,73.3);
  c.bezierCurveTo(54.0,73.2,58.8,69.4,62.2,64.2);
  c.bezierCurveTo(65.4,59.0,70.4,51.6,71.0,44.0);
  c.bezierCurveTo(72.6,36,72.6,26,71.2,16);
  c.bezierCurveTo(67,0,37,0,31.0,16);
  c.closePath(); }
function neckPath(c){ c.beginPath();
  c.moveTo(41.6,58); c.bezierCurveTo(42.3,70,41.8,80,40.2,90); c.lineTo(38.6,104); c.lineTo(63.8,104); c.lineTo(62.2,90);
  c.bezierCurveTo(60.6,80,60.0,70,60.8,57); c.closePath(); }
/* the mouth, drawn at 1.08 x 1.1 about its middle so the lips are full; the corners lift a little */
const LX=x=>47.8+(x-47.8)*1.08, LY=y=>62.9+(y-62.9)*1.1;
function lipsPath(c){ const m=(x,y)=>c.moveTo(LX(x),LY(y)), b=(a,b2,cc,d,e,f)=>c.bezierCurveTo(LX(a),LY(b2),LX(cc),LY(d),LX(e),LY(f)), q=(a,b2,cc,d)=>c.quadraticCurveTo(LX(a),LY(b2),LX(cc),LY(d));
  c.beginPath(); m(41.0,61.95); b(42.6,60.9,44.2,60.1,45.6,60.0); q(46.5,59.95,47.3,60.55); q(48.1,59.95,49.0,59.95); b(50.9,60.1,53.0,60.8,54.6,61.75);
  b(53.2,64.6,50.6,65.9,47.8,65.9); b(44.8,65.9,42.4,64.6,41.0,61.95); c.closePath(); }
const mouthLine=c=>{ c.moveTo(LX(41.0),LY(61.95)); c.bezierCurveTo(LX(43.0),LY(62.65),LX(45.2),LY(62.95),LX(47.4),LY(62.8)); c.bezierCurveTo(LX(49.6),LY(62.95),LX(52.6),LY(62.5),LX(54.6),LY(61.75)); };
const mouthY=x=>62.88-.66*Math.pow((x-47.6)/7.5,2);

/* the hair: two sides, each the space between an inner guide (the hairline across the forehead, then down behind the cheek and
   beside the neck) and an outer guide (the silhouette); strands are drawn between the two, so they follow both. The sides sit behind
   the face; only where the hair crosses the forehead is it drawn again in front. */
const HAIR={
  inL:[[60.4,13.2],[55.2,16.0],[49.4,19.6],[44.0,23.2],[39.0,27.0],[35.0,31.2],[31.8,35.8],[29.6,41.5],[28.4,48],[28.2,56],[30.0,64],[33.0,72],[35.6,82],[36.4,92],[36.0,106]],
  outL:[[60.4,-9],[44,-7.5],[29,-2.5],[18.5,8],[13.2,22],[11.0,38],[10.6,54],[11.8,68],[13.6,81],[15.0,93],[16.0,106]],
  inR:[[60.4,13.2],[63.8,15.8],[66.6,20.0],[68.4,25.2],[69.6,31.0],[70.8,37.0],[72.2,42.5],[73.6,49],[72.8,58],[70.4,66],[67.4,74],[66.0,84],[65.6,94],[65.8,106]],
  outR:[[60.4,-9],[75,-7],[83.5,1.5],[88.6,14],[90.6,29],[91.4,45],[91.0,61],[89.6,77],[87.6,91],[86.6,106]]
};
const HK=70;   /* points along each guide */
function hairSides(){ const R=k=>resample(catmull(HAIR[k],8),HK); return { L:[R('inL'),R('outL')], R:[R('inR'),R('outR')] }; }
const sidePoly=s=>s[0].concat(s[1].slice().reverse());

/* the sculpt: a soft dome (from the face's own outline) plus the forms of a face */
function noseRidge(x,y){ if(y<35||y>56) return 0;
  const t=clamp((y-38.5)/14), cx=lerp(47.5,46.2,t), w=lerp(1.7,2.2,t), h=lerp(.7,2.8,Math.pow(t,1.4));
  const a=(x-cx)/w; return h*Math.exp(-.5*a*a)*sstep(35.5,39.5,y)*(1-sstep(52.4,54.6,y)); }
function faceForms(x,y){ let h=0;
  h+=1.6*G(x,y,50.5,24,13,9);
  h+=1.0*G(x,y,39.0,35.3,5,1.6)+1.0*G(x,y,57.4,35.1,5.5,1.6);
  h-=2.4*G(x,y,38.5,40.4,4.8,2.8)+2.6*G(x,y,57.1,40.3,5.1,2.8);
  h-=1.3*G(x,y,44.0,41.2,1.5,2.1)+1.4*G(x,y,51.6,41.2,1.6,2.1);
  h+=1.3*G(x,y,38.5,40.8,3.8,1.75)+1.4*G(x,y,57.1,40.7,4.0,1.75);
  h+=noseRidge(x,y)+1.7*G(x,y,46.2,52.0,2.2,1.8)+1.1*G(x,y,43.4,53.9,1.6,1.25)+1.3*G(x,y,50.3,54.0,1.8,1.3);
  h-=.3*G(x,y,46.8,55.8,3.2,.75);
  h+=2.2*G(x,y,35.6,47.5,5,4.2)+2.6*G(x,y,62.8,47,6,4.8);
  h-=.7*G(x,y,38.5,56.5,3,3.6)+.8*G(x,y,59.5,56,3.5,3.6);
  h+=1.15*G(x,y,47.6,61.1,6.5,1.1)+1.7*G(x,y,47.8,64.4,5.6,1.45);
  h-=.3*G(x,y,47.2,58.0,.7,1.1);
  h-=.95*G(x,y,47.8,67.4,4.8,.95);
  h-=.55*G(x,y,40.5,62.3,1.0,1.0)+.55*G(x,y,55.2,62.0,1.0,1.0);
  h+=1.3*G(x,y,48.5,70.0,4.2,2.4);
  return h; }

/* the eyes: corners, lids and irises */
/* drawn at 1.12 about each eye's middle, and each middle moved 0.4 outward, so the gap between them stays one eye wide */
const eyeAt=(e,cx,cy,s,dx)=>{ const f=p=>[cx+dx+(p[0]-cx)*s, cy+(p[1]-cy)*s]; return {I:f(e.I),O:f(e.O),up:e.up.map(f),lo:e.lo.map(f),iris:f(e.iris),ir:e.ir*s,dir:e.dir,seed:e.seed}; };
const EYES=[
  eyeAt({ I:[42.9,41.4], O:[34.8,40.7], up:[[41.9,39.0],[37.6,37.9]], lo:[[36.2,42.6],[41.0,43.0]], iris:[39.6,40.55], ir:1.78, dir:-1, seed:37 },38.85,41.05,1.12,-.4),
  eyeAt({ I:[52.3,41.4], O:[61.0,40.7], up:[[53.3,38.9],[57.9,37.8]], lo:[[59.4,42.6],[54.2,43.0]], iris:[57.0,40.5], ir:1.86, dir:1, seed:31 },56.65,41.05,1.12,.4)
];
function eyeOpening(c,e){ c.beginPath(); c.moveTo(e.I[0],e.I[1]); c.bezierCurveTo(e.up[0][0],e.up[0][1],e.up[1][0],e.up[1][1],e.O[0],e.O[1]);
  c.bezierCurveTo(e.lo[0][0],e.lo[0][1],e.lo[1][0],e.lo[1][1],e.I[0],e.I[1]); c.closePath(); }
function drawEye(c,T,e){
  const upPt=t=>bez(e.I,e.up[0],e.up[1],e.O,t), loPt=t=>bez(e.O,e.lo[0],e.lo[1],e.I,t);
  /* a little warm shadow on the lid up to its fold, and the eye sitting in it */
  const crease=[]; for(let i=0;i<=20;i++){ const t=i/20, p=upPt(t), lift=1.2+.35*Math.sin(Math.PI*t); crease.push([p[0]+e.dir*.15*t,p[1]-lift]); }
  softFill(c,T,x=>{ x.beginPath(); crease.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1])); for(let i=20;i>=0;i--){ const p=upPt(i/20); x.lineTo(p[0],p[1]); } x.closePath(); },.6,'rgba(150,92,76,.34)','multiply');
  softFill(c,T,x=>eyeOpening(x,e),.35,'rgba(120,66,54,.45)','multiply');
  c.save(); c.strokeStyle='rgba(112,62,48,.32)'; c.lineWidth=.22; c.lineCap='round'; linePath(c,crease.slice(3,19)); c.stroke(); c.restore();
  /* the white of the eye, never paper white: shaded into the corners and under the lid */
  c.save(); eyeOpening(c,e); c.clip();
  const cx=(e.I[0]+e.O[0])/2, cy=(e.I[1]+e.O[1])/2;
  let g=c.createRadialGradient(e.iris[0],cy+.25,.4,e.iris[0],cy+.25,4.4); g.addColorStop(0,'#eee5dc'); g.addColorStop(.5,'#ddd0c5'); g.addColorStop(1,'#a88c7f');
  c.fillStyle=g; c.fillRect(cx-6,cy-4,12,8);
  /* the iris: a warm hazel, darker at its rim, fibres, pupil */
  const [ix,iy]=e.iris, r=e.ir;
  g=c.createRadialGradient(ix,iy,r*.2,ix,iy,r); g.addColorStop(0,'#5d3f24'); g.addColorStop(.42,'#82592f'); g.addColorStop(.78,'#58391f'); g.addColorStop(1,'#26170d');
  c.fillStyle=g; c.beginPath(); c.arc(ix,iy,r,0,TAU); c.fill();
  const RF=rng(e.seed); c.lineCap='round';
  for(let i=0;i<54;i++){ const a=i/54*TAU+RF()*.1, r0=r*.42, r1=r*(.75+RF()*.2); c.strokeStyle=RF()<.5?'rgba(190,140,82,.26)':'rgba(40,24,14,.3)'; c.lineWidth=.06+RF()*.05;
    c.beginPath(); c.moveTo(ix+Math.cos(a)*r0,iy+Math.sin(a)*r0); c.lineTo(ix+Math.cos(a+.07)*r1,iy+Math.sin(a+.07)*r1); c.stroke(); }
  c.strokeStyle='rgba(24,14,8,.5)'; c.lineWidth=.22; c.beginPath(); c.arc(ix,iy,r-.12,0,TAU); c.stroke();
  c.fillStyle='#0c0705'; c.beginPath(); c.arc(ix,iy,r*.38,0,TAU); c.fill();
  /* the upper lid's shadow across the top of the eye, and a little along the bottom */
  g=c.createLinearGradient(0,cy-2.3,0,cy+.5); g.addColorStop(0,'rgba(46,22,16,.72)'); g.addColorStop(.55,'rgba(46,22,16,.2)'); g.addColorStop(1,'rgba(46,22,16,0)');
  c.fillStyle=g; c.fillRect(cx-6,cy-4,12,6);
  /* the light's reflection, up and to the left like the light */
  c.fillStyle='rgba(255,252,246,.88)'; c.beginPath(); c.ellipse(ix-r*.4,iy-r*.4,r*.13,r*.1,-.5,0,TAU); c.fill();
  c.fillStyle='rgba(255,246,236,.22)'; c.beginPath(); c.ellipse(ix+r*.35,iy+r*.45,r*.28,r*.12,-.3,0,TAU); c.fill();
  c.restore();
  /* the inner corner */
  softFill(c,T,x=>{ x.beginPath(); x.ellipse(e.I[0]-e.dir*.42,e.I[1]-.05,.42,.3,0,0,TAU); },.12,'rgba(200,118,106,.8)');
  /* the lower lid: its rim catches a little light, a soft line under it, three faint lashes at the outer end */
  c.save(); c.lineCap='round';
  softFill(c,T,x=>{ x.beginPath(); for(let i=0;i<=16;i++){ const p=loPt(i/16); i?x.lineTo(p[0],p[1]+.12):x.moveTo(p[0],p[1]+.12); } for(let i=16;i>=0;i--){ const p=loPt(i/16); x.lineTo(p[0],p[1]+.42); } x.closePath(); },.12,'rgba(120,64,52,.42)','multiply');
  c.strokeStyle='rgba(226,170,156,.5)'; c.lineWidth=.14; c.beginPath(); for(let i=2;i<=14;i++){ const p=loPt(i/16); i>2?c.lineTo(p[0],p[1]-.05):c.moveTo(p[0],p[1]-.05); } c.stroke();
  c.strokeStyle='rgba(40,24,16,.35)'; c.lineWidth=.07;
  for(let i=0;i<4;i++){ const p=loPt(.06+i*.07); c.beginPath(); c.moveTo(p[0],p[1]+.2); c.lineTo(p[0]+e.dir*(.18+.06*(4-i)),p[1]+.55+.05*(4-i)); c.stroke(); }
  /* the upper lash line: a soft dark under a crisp one, heavier toward the outer corner, lifting at the end */
  /* (seen this close, a heavy winged line and a comb of thick curls read as drawn: the line is thin, the lashes many and fine) */
  const lash=(x,grow)=>{ x.beginPath();
    for(let i=0;i<=24;i++){ const p=upPt(i/24); i?x.lineTo(p[0],p[1]+.05):x.moveTo(p[0],p[1]+.05); }
    x.lineTo(e.O[0]+e.dir*(.18+grow),e.O[1]-.12-grow*.4);
    for(let i=24;i>=0;i--){ const t=i/24, p=upPt(t), th=.08+(.17+grow)*Math.pow(t,1.5); x.lineTo(p[0],p[1]-th); } x.closePath(); };
  softFill(c,T,x=>lash(x,.12),.3,'rgba(40,24,16,.5)');
  c.fillStyle='#22160f'; lash(c,0); c.fill();
  /* the upper lashes: many fine ones, uneven in length and lean, gathered into loose clumps, longer toward the outer corner */
  const RL=rng(e.seed+5);
  for(let i=0;i<52;i++){ const f=i/51, t=.18+.82*f+(RL()-.5)*.025, p=upPt(clamp(t)), cl=Math.sin(f*31+e.seed)*.5+.5, L=(.32+.62*Math.pow(f,1.1))*(.7+RL()*.45), lean=(RL()-.5)*.35+cl*.12;
    c.strokeStyle='rgba(22,14,10,'+(.5+RL()*.35).toFixed(2)+')'; c.lineWidth=.035+RL()*.03;
    c.beginPath(); c.moveTo(p[0],p[1]-.08); c.quadraticCurveTo(p[0]+e.dir*L*(.12+lean*.3),p[1]-L*.8,p[0]+e.dir*L*(.55+lean),p[1]-L*.95); c.stroke(); }
  c.restore();
}
/* a brow: a soft tapered body along its spine, then fine hairs that lean outward */
function drawBrow(c,T,spine,th,dir,seed){
  const S=resample(catmull(spine,10),40), top=[], bot=[];
  const wid=f=>f<.55?lerp(th[0],th[1],f/.55):lerp(th[1],th[2],Math.pow((f-.55)/.45,1.2));
  for(let i=0;i<S.length;i++){ const a=S[Math.max(0,i-1)], b=S[Math.min(S.length-1,i+1)], tx=b[0]-a[0], ty=b[1]-a[1], m=Math.hypot(tx,ty)||1;
    let nx=-ty/m, ny=tx/m; if(ny>0){ nx=-nx; ny=-ny; }   /* the normal that points up */
    const w=wid(i/(S.length-1)); top.push([S[i][0]+nx*w*.5,S[i][1]+ny*w*.5]); bot.push([S[i][0]-nx*w*.5,S[i][1]-ny*w*.5]); }
  const body=top.concat(bot.slice().reverse());
  softFill(c,T,x=>polyPath(x,body),.28,'rgba(62,40,27,.55)');
  const R=rng(seed); c.save(); c.lineCap='round';
  for(let i=0;i<120;i++){ const f=Math.pow(R(),.9), j=Math.min(S.length-1,Math.floor(f*(S.length-1))), p=S[j], w=wid(f);
    const off=(R()-.5)*w*.85, j2=Math.min(S.length-1,j+1), j1=Math.max(0,j-1), along=Math.atan2(S[j2][1]-S[j1][1],S[j2][0]-S[j1][0]);
    const ang=f<.15?along-dir*(.9-f*3):along+(R()-.5)*.25, L=(.7+R()*.6)*(f<.15?.8:1);
    c.strokeStyle=R()<.75?'rgba(34,21,14,'+(.4+R()*.35).toFixed(2)+')':'rgba(98,66,44,.4)'; c.lineWidth=.06+R()*.05;
    const x0=p[0], y0=p[1]+off*Math.cos(along); c.beginPath(); c.moveTo(x0-Math.cos(ang)*L*.3,y0-Math.sin(ang)*L*.3); c.quadraticCurveTo(x0+Math.cos(ang)*L*.3,y0+Math.sin(ang)*L*.3-.08,x0+Math.cos(ang)*L*.7,y0+Math.sin(ang)*L*.7+.05); c.stroke(); }
  c.restore();
}

/* the close-up's own skin, per frame pixel, in face units throughout: BM a height that only tilts the normal the light sees, AL the
   skin's own brightness, RD redness, BN brown marks. Pores sit in most cells of a jittered grid, fine on the lid and under the eye and
   more open on the cheek; the surface carries a fine orange-peel bump; one faint line runs under the eye, the lower lid's curve a
   little lower and flatter; redness is blotchy over the cheek and beside the nose; SK_MARKS are the blemishes, about half each side
   of where the split holds: raised red spots and flat red-brown marks, each a little off-round. (The painter's own red mark at
   66.2, 43 falls in this crop; the close-up leaves it out, so the marks stay a few.) */
const SK_MARKS=[ /* x, y, radius, raised 0..1, brown 0..1 */
  [55.4,47.2,.36,1,0],[58.4,48.9,.28,0,1],[56.6,45.1,.24,.6,0],
  [63.5,45.5,.4,1,0],[66.3,48.6,.3,.8,0],[62.7,49.2,.27,0,1] ];
function closeSkin(W,FX,FY){
  const N=W*W, BM=new Float32Array(N), AL=new Float32Array(N), RD=new Float32Array(N), BN=new Float32Array(N), CSZ=.46;
  for(let y=0;y<W;y++){ const uy=FY(y), fineU=sstep(42.6,47.2,uy);
    for(let x=0;x<W;x++){ const i=y*W+x, ux=FX(x);
      let bm=0, al=0, rd=0, bn=0;
      /* pores: a dark pit each, its walls lit on one side and shadowed on the other by the key */
      const ps=lerp(.55,1.1,fineU)*lerp(1,1.12,sstep(60,66,ux)), gx=Math.floor(ux/CSZ), gy=Math.floor(uy/CSZ);
      for(let a=-1;a<=1;a++) for(let b=-1;b<=1;b++){
        const k=(gx+a)*131.7+(gy+b)*977.3, h4=hash(k,54); if(h4>.82) continue;
        const pr=(.075+.06*hash(k,53))*ps, dx=ux-(gx+a+.15+.7*hash(k,51))*CSZ, dy=uy-(gy+b+.15+.7*hash(k,52))*CSZ, q=(dx*dx+dy*dy)/(pr*pr);
        if(q>9) continue;
        const e=Math.exp(-q); bm-=.022*(.7+.6*h4)*ps*e; al-=.07*ps*e; }
      /* the surface's fine bump, finer and flatter on the lid and under the eye */
      bm+=((vn2(ux*2.3+11.3,uy*2.3+4.1,44)-.5)*.08+(vn2(ux*4.7+3.3,uy*4.7+8.9,45)-.5)*.03)*lerp(.45,1,fineU);
      /* one faint line under the eye, broken along its length */
      if(ux>54.2&&ux<61.6&&uy>42.4&&uy<45.2){ const dd=ux-57.2, gl=(uy-(43.85-.07*dd-.03*dd*dd))/.085;
        bm-=.022*Math.exp(-gl*gl)*sstep(54.2,55.6,ux)*(1-sstep(60.2,61.6,ux))*(.45+.55*vn2(ux*1.6,3.7,49)); }
      /* blotchy redness over the cheek and beside the nose */
      const cheek=G(ux,uy,62,48.6,5.2,3.6)+.6*G(ux,uy,55.2,49.4,2.6,2.2);
      rd+=cheek*(.15*sstep(.45,.8,vn2(ux*.95+2.1,uy*.95+.7,47))+.05*vn2(ux*2.1+5.5,uy*2.1+1.3,48));
      /* the blemishes: a core with a smaller lobe beside it, and a faint inflamed halo round the red ones */
      for(let j=0;j<SK_MARKS.length;j++){ const m=SK_MARKS[j], dx=ux-m[0], dy=uy-m[1], r2=m[2]*m[2], d2=dx*dx+dy*dy; if(d2>r2*30) continue;
        const an=j*2.4+.5, lx=dx-Math.cos(an)*m[2]*.5, ly=dy-Math.sin(an)*m[2]*.5;
        const core=Math.max(Math.exp(-d2/r2),.7*Math.exp(-(lx*lx+ly*ly)/(r2*.45))), halo=Math.exp(-d2/(r2*5));
        bm+=.06*m[3]*core; rd+=(1-m[4])*(.7*core+.2*halo); bn+=.8*m[4]*core; }
      BM[i]=bm; AL[i]=al; RD[i]=rd; BN[i]=bn; } }
  return {BM,AL,RD,BN}; }

function paintPortrait(W,textured){
  const N=W*W, Z=SK_Z, K=W/100*Z, X0=SK_CX-50/Z, Y0=SK_CY-50/Z, T={K,X0,Y0,S:W};
  const FX=x=>X0+(x+.5)/K, FY=y=>Y0+(y+.5)/K, PX=u=>Math.round((u-X0)*K-.5), PY=u=>Math.round((u-Y0)*K-.5);
  const view=x=>x.setTransform(K,0,0,K,-X0*K,-Y0*K);
  /* masks (each painter fills its own path) */
  const mask=fn=>{ const [C,x]=sheet(W); view(x); x.fillStyle='#fff'; fn(x); const d=x.getImageData(0,0,W,W).data, m=new Float32Array(N); for(let i=0;i<N;i++) m[i]=d[i*4+3]/255; return m; };
  const HS=hairSides();
  const mF=mask(x=>{ facePath(x); x.fill(); }), mL0=mask(x=>{ lipsPath(x); x.fill(); });
  const mHair=mask(x=>{ polyPath(x,sidePoly(HS.L)); x.fill(); polyPath(x,sidePoly(HS.R)); x.fill(); });
  const mN0=mask(x=>{ neckPath(x); x.fill(); });
  const mN=new Float32Array(N), mFr=new Float32Array(N);
  for(let i=0;i<N;i++){ mN[i]=mN0[i]*(1-mHair[i]); mFr[i]=mHair[i]*mF[i]; }
  const mL=blurF(mL0,W,W,.2*K);
  /* hair: each side's mass, then strands between its guides, a sheen where the light falls on the crown */
  const strands=(c,s,side,seed,wisps)=>{
    const [inn,outr]=s, R=rng(seed);
    c.save(); polyPath(c,sidePoly(s)); c.clip();
    let g=c.createLinearGradient(side<0?14:88,0,side<0?34:68,0); g.addColorStop(0,'#2a1b12'); g.addColorStop(.6,'#24170f'); g.addColorStop(1,'#170e09'); c.fillStyle=g; c.fillRect(0,-10,100,120);
    c.lineCap='round'; c.lineJoin='round';
    for(let n=0;n<480;n++){
      const v=R(), ph=R()*TAU, amp=.01+R()*.025, k0=Math.floor(R()*HK*.4), len=Math.floor(HK*(.3+R()*.7));
      const pts=[]; for(let q=k0;q<Math.min(HK,k0+len);q++){ const vv=clamp(v+amp*Math.sin(q*.2+ph)); pts.push([lerp(inn[q][0],outr[q][0],vv),lerp(inn[q][1],outr[q][1],vv)]); }
      if(pts.length<2) continue;
      const mid=pts[Math.floor(pts.length/2)], top=clamp(1-(mid[1]-4)/34), lit=side<0?1:.6;
      const sheen=top*lit*Math.exp(-Math.pow((v-.42)/.3,2));
      const pick=R(); let col;
      if(pick<sheen*.85) col='rgba('+Math.round(lerp(120,176,R()))+','+Math.round(lerp(82,122,R()))+','+Math.round(lerp(54,82,R()))+','+(.22+sheen*.38).toFixed(2)+')';
      else if(pick<.5) col='rgba(12,8,5,'+(.3+R()*.35).toFixed(2)+')';
      else col='rgba('+Math.round(lerp(60,92,R()))+','+Math.round(lerp(40,60,R()))+','+Math.round(lerp(27,40,R()))+','+(.2+R()*.3).toFixed(2)+')';
      c.strokeStyle=col; c.lineWidth=.14+R()*.3; linePath(c,pts); c.stroke(); }
    /* depth: the hair darkens where it turns in behind the face; a broad soft sheen where the crown faces the light */
    const strip=(v0,v1,q0,q1)=>x=>{ const a=[], b=[]; for(let q=q0;q<=q1;q++){ a.push([lerp(inn[q][0],outr[q][0],v0),lerp(inn[q][1],outr[q][1],v0)]); b.push([lerp(inn[q][0],outr[q][0],v1),lerp(inn[q][1],outr[q][1],v1)]); } polyPath(x,a.concat(b.reverse())); };
    softFill(c,T,strip(-.05,.16,6,HK-1),1.3,'rgba(0,0,0,.42)','multiply');
    softFill(c,T,strip(.88,1.05,0,HK-1),1.0,'rgba(0,0,0,.3)','multiply');
    softFill(c,T,strip(.28,.6,2,side<0?24:18),1.8,side<0?'rgba(196,146,104,.17)':'rgba(196,146,104,.09)','screen');
    c.restore();
    if(wisps){ const RW=rng(seed+1); c.save(); c.lineCap='round';
      for(let n=0;n<26;n++){ const v=-.035+RW()*.05, ph=RW()*TAU, k0=Math.floor(RW()*HK*.3), len=8+Math.floor(RW()*14), pts=[];
        for(let q=k0;q<Math.min(HK,k0+len);q++){ const vv=v+.02*Math.sin(q*.3+ph); pts.push([lerp(inn[q][0],outr[q][0],vv),lerp(inn[q][1],outr[q][1],vv)]); }
        c.strokeStyle=RW()<.6?'rgba(30,19,12,.45)':'rgba(96,66,44,.35)'; c.lineWidth=.1+RW()*.12; linePath(c,pts); c.stroke(); }
      c.restore(); }
  };
  /* the backdrop, the hair behind the head and the hair at the sides (all behind the face) */
  const [C,c]=sheet(W); view(c);
  let g=c.createLinearGradient(6,0,94,100); g.addColorStop(0,'#737e88'); g.addColorStop(.5,'#4a535c'); g.addColorStop(1,'#272c32'); c.fillStyle=g; c.fillRect(-10,-10,120,120);
  c.fillStyle='#1a110b'; polyPath(c,HS.L[1].concat(HS.R[1].slice().reverse())); c.fill();
  strands(c,HS.L,-1,61,false); strands(c,HS.R,1,67,false);
  c.setTransform(1,0,0,1,0,0);
  const bgIm=c.getImageData(0,0,W,W), P=bgIm.data;
  for(let i=0;i<N;i++){ const n=(hash(i*1.37,4)-.5)*5; P[i*4]+=n; P[i*4+1]+=n; P[i*4+2]+=n; }
  /* heights: the face stands in front of the neck; a dome from each one's own outline, plus the forms */
  const pF=blurF(mF,W,W,4.2*K), pN=blurF(mN0,W,W,3.6*K);
  const HF=new Float32Array(N), HN=new Float32Array(N), HC=new Float32Array(N);
  for(let y=0;y<W;y++) for(let x=0;x<W;x++){ const i=y*W+x, ux=FX(x), uy=FY(y);
    if(pF[i]>.02){ const e=1-((ux-51.5)/25)**2-((uy-46)/37)**2; HF[i]=11+11*Math.sqrt(clamp((pF[i]-.28)/.72))+10*Math.sqrt(Math.max(0,e))+faceForms(ux,uy); }
    if(pN[i]>.02){ const e=1-((ux-51.2)/14)**2; HN[i]=1+6*Math.sqrt(clamp((pN[i]-.28)/.72))+7*Math.sqrt(Math.max(0,e)); }
    HC[i]=mF[i]>.5?HF[i]:mN0[i]>.5?HN[i]:0; }
  const HB=blurF(HF,W,W,2.2*K), HNB=blurF(HN,W,W,2.5*K);
  const hsh=blurF(mFr,W,W,1.2*K);
  /* the light: one big soft key up and to the left of the camera */
  let Lx=-.32, Ly=-.38, Lz=.87; { const m=Math.hypot(Lx,Ly,Lz); Lx/=m; Ly/=m; Lz/=m; }
  const Lxy=Math.hypot(Lx,Ly), dX=Lx/Lxy, dY=Ly/Lxy, slope=Lz/Lxy;
  let Hx=Lx, Hy=Ly, Hz=Lz+1; { const m=Math.hypot(Hx,Hy,Hz); Hx/=m; Hy/=m; Hz/=m; }
  const march=(ux,uy,h0)=>{ let sh=1; for(let t=.5;t<15;t+=.45){ const qx=PX(ux+dX*t), qy=PY(uy+dY*t); if(qx<0||qy<0||qx>=W||qy>=W) break;
    const over=HC[qy*W+qx]-(h0+slope*t); if(over>0){ sh=Math.min(sh,1-sstep(0,.6+.22*t,over)); if(sh<=0) break; } } return sh; };
  /* the cast shadows are soft, so they are worked out at half the pixels and read back smoothly */
  const W2=W>>1, SHF=new Float32Array(W2*W2).fill(1), SHN=new Float32Array(W2*W2).fill(1);
  for(let y=0;y<W2;y++) for(let x=0;x<W2;x++){ const j=(2*y+1)*W+2*x+1, ux=X0+(2*x+1)/K, uy=Y0+(2*y+1)/K;
    if(pF[j]>.02) SHF[y*W2+x]=march(ux,uy,HF[j]); if(pN[j]>.02) SHN[y*W2+x]=march(ux,uy,HN[j]); }
  const shAt=(A,x,y)=>{ const fx=clamp((x+.5)/2-.5,0,W2-1.001), fy=clamp((y+.5)/2-.5,0,W2-1.001), x0=fx|0, y0=fy|0, ax=fx-x0, ay=fy-y0, o=y0*W2+x0;
    return lerp(lerp(A[o],A[o+1],ax),lerp(A[o+W2],A[o+W2+1],ax),ay); };
  /* the close-up's pores, surface, redness and blemishes (only on the textured version) */
  const CS=textured?closeSkin(W,FX,FY):null;
  /* the skin's own marks (only on the textured version): light freckles over the nose and cheeks, a few small red marks */
  const RS=rng(23), frk=[], red=[];
  for(let i=0;i<80;i++){ const a=RS()*TAU, rr=Math.sqrt(RS()); const fx=47+Math.cos(a)*rr*15, fy=47+Math.sin(a)*rr*5.5; if(fy<43.4) continue; frk.push([fx,fy,.16+RS()*.16,.05+RS()*.06]); }
  for(let i=0;i<24;i++){ frk.push([32+RS()*38,22+RS()*48,.14+RS()*.14,.03+RS()*.04]); }
  for(const p of [[40.0,28.5,.5],[54.8,69.6,.45],[63.8,55.5,.5],[42.2,67.6,.4],[52.4,24.6,.4],[66.2,43.0,.42]]) red.push(p);
  const fCell=new Map(); const cellKey=(x,y)=>(Math.floor(x/3))*1000+Math.floor(y/3);
  frk.forEach(f=>{ const kk=cellKey(f[0],f[1]); if(!fCell.has(kk)) fCell.set(kk,[]); fCell.get(kk).push(f); });
  for(let y=0;y<W;y++) for(let x=0;x<W;x++){
    const i=y*W+x, f=mF[i], nmk=mN[i]; if(f<.002&&nmk<.002) continue;
    const ux=FX(x), uy=FY(y);
    /* the slope's neighbours, held at the sheet's edge: in the close-up the skin runs to all four sides */
    const il=x>0?i-1:i, ir=x<W-1?i+1:i, iu=y>0?i-W:i, idn=y<W-1?i+W:i, dxp=ir-il, dyp=(idn-iu)/W;
    const hq=PY(uy-1.5)*W+PX(ux-1.1), hs=hq>=0&&hq<N?hsh[hq]:0;
    const shade=(H,HBl,isFace)=>{
      const sh=shAt(isFace?SHF:SHN,x,y);
      let hx=(H[ir]-H[il])*K/dxp, hy=(H[idn]-H[iu])*K/dyp;
      if(isFace&&CS){ hx+=(CS.BM[ir]-CS.BM[il])*K/dxp; hy+=(CS.BM[idn]-CS.BM[iu])*K/dyp; }
      let nx=-hx, ny=-hy, nz=1; const m=Math.hypot(nx,ny,nz); nx/=m; ny/=m; nz/=m;
      const nl=nx*Lx+ny*Ly+nz*Lz, ao=1-clamp((HBl[i]-H[i])*.07)*.8;
      const dl=clamp((nl+.2)/1.2)*(.3+.7*sh)*(isFace?(1-.6*hs):1);
      const fill=Math.max(0,nx*.55+ny*.15+nz*.82);
      /* skin colour, then its local colour: a little warmer on the forehead, pinker on the cheeks and nose, darker under the eyes */
      let ar=.93, ag=.755, ab=.645;
      if(isFace){
        const bl=.5*G(ux,uy,36.5,50,4.6,3.6)+.55*G(ux,uy,62.5,49.5,5.6,4.0)+.3*G(ux,uy,46.3,52.2,2.2,1.6)+.15*G(ux,uy,48.4,70.5,4,2.6);
        ar=lerp(ar,.95,bl*.3); ag=lerp(ag,.63,bl*.3); ab=lerp(ab,.58,bl*.3);
        const fh=G(ux,uy,50,26,14,8); ag*=1+.015*fh; ab*=1-.02*fh;
        const ue=G(ux,uy,38.5,44.3,3.5,1.0)+G(ux,uy,57.1,44.3,3.7,1.0); ar*=1-.04*ue; ag*=1-.06*ue; ab*=1-.025*ue;
        const lp=mL[i]; if(lp>0){ const up=uy<mouthY(ux)?1:0; ar=lerp(ar,up?.69:.79,lp); ag=lerp(ag,up?.40:.50,lp); ab=lerp(ab,up?.40:.47,lp); }
      } else { const sd=1-.12*sstep(76,96,uy); ar=.82*sd; ag=.645*sd; ab=.56*sd; }   /* the neck: a shade darker than the face, more so lower down */
      if(textured){
        const fine=(vn2(ux*2.4,uy*2.4,11)-.5)*.07+(vn2(ux*1.3,uy*1.3,15)-.5)*.055+(hash(i*.731,9)-.5)*.026, blot=(vn2(ux*.7,uy*.7,12)-.5)*.065, rd=(vn2(ux*.45+5,uy*.45,13)-.5);
        let fr=0; for(let ox=-1;ox<=1;ox++) for(let oy=-1;oy<=1;oy++){ const L=fCell.get(cellKey(ux+ox*3,uy+oy*3)); if(!L) continue; for(const q of L){ const dx=ux-q[0], dy=uy-q[1], d2=dx*dx+dy*dy; if(d2<q[2]*q[2]*6) fr+=q[3]*Math.exp(-d2/(q[2]*q[2])); } }
        if(CS) fr*=.45;   /* this close the freckles are big enough to read as specks: lighter */
        let rm=0; if(!CS) for(const q of red){ const dx=ux-q[0], dy=uy-q[1], d2=dx*dx+dy*dy; if(d2<q[2]*q[2]*8) rm+=Math.exp(-d2/(q[2]*q[2])); }
        const sk=1-(isFace?mL[i]*.7:0);
        ar*=1+(fine+blot+rd*.05-fr*.6+rm*.02)*sk; ag*=1+(fine+blot-rd*.045-fr*1.0-rm*.15)*sk; ab*=1+(fine*1.05+blot-rd*.035-fr*1.25-rm*.12)*sk;
        if(isFace&&CS){ const ca=CS.AL[i], cr=CS.RD[i], cb=CS.BN[i]; ar*=1+ca+.025*cr-.04*cb; ag*=1.025+ca-.19*cr-.13*cb; ab*=1.035+ca*1.05-.15*cr-.17*cb; }   /* (and a touch less pink: this close the blush filled the frame) */
      }
      const sss=4*dl*(1-dl)*.7;
      let r=ar*(.32*ao+.76*dl+.05*fill)+ar*.2*sss, gg=ag*(.26*ao+.75*dl+.05*fill)+ag*.05*sss, b=ab*(.27*ao+.71*dl+.08*fill)+ab*.02*sss;
      const nh=Math.max(0,nx*Hx+ny*Hy+nz*Hz);
      let ks=.04;
      if(isFace){ const lp=mL[i]; ks+=.08*G(ux,uy,50.5,25,10,6)+.05*clamp(noseRidge(ux,uy)/2.5)+.1*G(ux,uy,46.1,51.8,1.4,1.1)+.06*G(ux,uy,36.5,46.5,3.5,2.5)+.06*G(ux,uy,62.5,46,4,2.6)+.05*G(ux,uy,48.4,70.5,3,2)+lp*(uy>mouthY(ux)+.4?.18:.04); }
      const sp=ks*Math.pow(nh,22)*(.3+.7*sh)*(isFace?(1-.6*hs):1)*(textured?1+(vn2(ux*3,uy*3,14)-.5)*.6:1);
      r+=sp; gg+=sp*.97; b+=sp*.93;
      return [r*255,gg*255,b*255];
    };
    const j=i*4; let R0=P[j], G0=P[j+1], B0=P[j+2];
    if(nmk>.002){ const s=shade(HN,HNB,false); R0=lerp(R0,s[0],nmk); G0=lerp(G0,s[1],nmk); B0=lerp(B0,s[2],nmk); }
    if(f>.002){ const s=shade(HF,HB,true); R0=lerp(R0,s[0],f); G0=lerp(G0,s[1],f); B0=lerp(B0,s[2],f); }
    P[j]=R0; P[j+1]=G0; P[j+2]=B0;
  }
  c.putImageData(bgIm,0,0);
  view(c);
  /* the nose: the creases round its wings, the nostrils, a soft light on the tip */
  softFill(c,T,x=>{ x.beginPath(); x.moveTo(42.6,52.4); x.quadraticCurveTo(41.6,54.4,43.4,55.5); x.lineTo(43.9,55.2); x.quadraticCurveTo(42.6,54.2,43.3,52.6); x.closePath();
    x.moveTo(51.0,52.4); x.quadraticCurveTo(52.2,54.4,50.2,55.6); x.lineTo(49.7,55.3); x.quadraticCurveTo(51.1,54.2,50.4,52.6); x.closePath(); },.4,'rgba(160,92,74,.26)','multiply');
  softFill(c,T,x=>{ x.beginPath(); x.ellipse(45.15,55.0,.52,.3,-.25,0,TAU); x.ellipse(48.25,55.1,.6,.32,.25,0,TAU); },.2,'rgba(100,46,36,.48)','multiply');
  softFill(c,T,x=>{ x.beginPath(); x.ellipse(45.9,51.7,.75,.6,0,0,TAU); },.45,'rgba(255,236,224,.22)','screen');
  /* the line where the lips meet, the corners of the smile, the light along the top of the upper lip */
  /* (each path below is written in the mouth's own drawing and goes through LX, LY like the lips) */
  const lp=x=>({ m:(a,b)=>x.moveTo(LX(a),LY(b)), l:(a,b)=>x.lineTo(LX(a),LY(b)), b:(a,b,c2,d,e,f)=>x.bezierCurveTo(LX(a),LY(b),LX(c2),LY(d),LX(e),LY(f)), q:(a,b,c2,d)=>x.quadraticCurveTo(LX(a),LY(b),LX(c2),LY(d)) });
  softFill(c,T,x=>{ const p=lp(x); x.beginPath(); mouthLine(x); p.l(54.6,62.05); p.b(52.6,62.85,49.6,63.3,47.4,63.15); p.b(45.2,63.3,43.0,63.0,41.0,62.2); x.closePath(); },.18,'rgba(110,48,44,.7)','multiply');
  softFill(c,T,x=>{ x.beginPath(); x.ellipse(LX(40.8),LY(62.0),.55,.4,.6,0,TAU); x.ellipse(LX(54.8),LY(61.8),.6,.42,-.6,0,TAU); },.3,'rgba(130,70,58,.45)','multiply');
  softFill(c,T,x=>{ const p=lp(x); x.beginPath(); p.m(42.4,61.0); p.b(43.6,60.2,44.8,59.75,45.6,59.75); p.q(46.5,59.7,47.3,60.3); p.q(48.1,59.7,49.0,59.7); p.b(50.4,59.8,51.8,60.2,53.2,60.9);
    p.l(53.1,61.1); p.b(51.8,60.5,50.4,60.1,49.0,60.05); p.q(48.1,60.05,47.3,60.65); p.q(46.5,60.05,45.6,60.1); p.b(44.8,60.1,43.6,60.5,42.5,61.15); x.closePath(); },.12,'rgba(255,226,214,.32)','screen');
  c.save(); c.strokeStyle='rgba(84,34,32,.5)'; c.lineWidth=.16; c.lineCap='round'; c.beginPath(); mouthLine(c); c.stroke(); c.restore();
  /* brows and eyes */
  drawBrow(c,T,[[44.2,36.5],[41.6,34.8],[38.7,33.8],[35.8,34.1],[33.1,35.6]],[1.9,1.4,.42],-1,41);
  drawBrow(c,T,[[51.8,36.5],[54.6,34.7],[57.9,33.7],[61.0,34.0],[63.9,35.4]],[1.95,1.45,.45],1,43);
  EYES.forEach(e=>drawEye(c,T,e));
  /* the hair again, in front, only where it crosses the face: the sweep over the forehead */
  c.save(); facePath(c); c.clip(); strands(c,HS.L,-1,61,true); strands(c,HS.R,1,67,true); c.restore();
  /* the part */
  c.save(); c.strokeStyle='rgba(120,84,66,.32)'; c.lineWidth=.22; c.beginPath(); c.moveTo(60.3,-1); c.lineTo(60.4,13.0); c.stroke(); c.restore();
  /* a camera's own softness: one [1 2 1] pass each way, so the drawn edges sit in the picture like the skin does */
  const d=c.getImageData(0,0,W,W).data, tmp=new Float32Array(d.length);
  for(let y=0;y<W;y++) for(let x=0;x<W;x++){ const i=(y*W+x)*4, l=(y*W+Math.max(0,x-1))*4, r=(y*W+Math.min(W-1,x+1))*4; for(let ch=0;ch<3;ch++) tmp[i+ch]=(d[l+ch]+2*d[i+ch]+d[r+ch])/4; }
  for(let y=0;y<W;y++) for(let x=0;x<W;x++){ const i=(y*W+x)*4, u=(Math.max(0,y-1)*W+x)*4, b=(Math.min(W-1,y+1)*W+x)*4; for(let ch=0;ch<3;ch++) d[i+ch]=(tmp[u+ch]+2*tmp[i+ch]+tmp[b+ch])/4; d[i+3]=255; }
  return d;
}

function buildSkin(){
  if(buildSkin.cache) return buildSkin.cache;
  const W=SK_W, src=paintPortrait(W,true), out=softSkinFx(src,W,W,SK_AMOUNT,SK_RADIUS,SK_KEEP);
  return buildSkin.cache={W,src,out,SRC:toCanvas(W,W,src),OUT:toCanvas(W,W,out)};
}

window.FX_TILES.push({ id:'softskin', name:'Soften Skin', section:'Blur', isNew:true, still:2.4,
  line:'At full strength (Amount 1, Smoothing size 20 px) with Keep detail 30, Soften Skin smooths pores and blemishes while the lashes and the edges of the eye stay sharp.',
  _proof(){ const b=buildSkin(); return {W:b.W, src:b.src, out:b.out, type:'softskin', params:{amount:SK_AMOUNT,radius:SK_RADIUS,keep:SK_KEEP}}; },
  make(px){
    const P=4.6, HOLD=49, B=buildSkin();
    /* both pictures scaled to the tile once, here, so each frame is two 1:1 copies rather than two upscales */
    const fit=im=>{ const C=document.createElement('canvas'); C.width=C.height=px; const x=C.getContext('2d'); x.imageSmoothingEnabled=true; x.imageSmoothingQuality='high'; x.drawImage(im,0,0,px,px); return C; };
    const SRCp=fit(B.SRC), OUTp=fit(B.OUT);
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      /* rough skin; the split sweeps in from the left with the result behind it, overshoots a little and settles; a long hold with
         rough and smooth side by side, the divider just past the iris; it sweeps back out and the rough skin holds. The loop starts
         and ends with no split, so there is no jump at the seam. */
      let s=0;
      if(u>=.5&&u<1.3){ const p=seg(u,.5,1.3); s=HOLD*(1-(1-p)*Math.exp(-5*p)*Math.cos(2.2*Math.PI*p)); }
      else if(u>=1.3&&u<3.6) s=HOLD;
      else if(u>=3.6&&u<4.15) s=HOLD*(1-E.inOut(seg(u,3.6,4.15)));
      c.drawImage(SRCp,0,0,100,100);
      if(s>.05){ c.drawImage(OUTp,0,0,s/100*px,px,0,0,s,100);
        /* a thin Bone hairline with a faint dark edge, so it reads on light skin and on the lashes alike */
        c.fillStyle='rgba(22,19,15,.45)'; c.fillRect(s-.8,0,1.6,100); c.fillStyle=BONE; c.fillRect(s-.3,0,.6,100); }
    };
  } });

/* ====================================================================================================================== */
/* SHARPEN. A dragonfly seen from above, close, against out-of-focus reeds: drawn here at twice its pixels and brought down to SH_W =
   270 frame px across (a 1080 frame seen in the viewer at 400 %), with a camera's faint noise, then softened the way a lens a touch
   out of focus softens it. Then PIXEL_FX.sharpen at Amount 1.5 (its default) and Radius 2 px (default 1), Skip flat areas 0, Halos Both. */
const SH_W=270, SH_AMT=1.5, SH_R=2, SH_SOFT=1.5;

/* the body runs from the head (upper right) down to the tail (lower left); A is that direction, Pp across it to the right */
const DF={ H:[66,28], A:[-.62,.78], Pp:[.78,.62] };
const dfAt=s=>[DF.H[0]+DF.A[0]*s, DF.H[1]+DF.A[1]*s];
function dfWings(){
  const mk=(s,side,bend,L,Wmax,c,b0,hl,veins,netFrom,stig,amber)=>{ const P=dfAt(s), sx=DF.Pp[0]*side, sy=DF.Pp[1]*side;
    let dx=sx+bend*DF.A[0], dy=sy+bend*DF.A[1]; const m=Math.hypot(dx,dy); dx/=m; dy/=m;
    const flip=((-dy)*DF.A[0]+dx*DF.A[1])>0?1:-1;   /* +y across the wing points toward the tail: the leading edge faces the head */
    return {rx:P[0]+sx*2.7, ry:P[1]+sy*2.7, dx, dy, flip, L, Wmax, c, b0, hl, veins, netFrom, stig, amber}; };
  const FV=[0,.06,.13,.22,.34,.48,.63,.8,1], HV=[0,.05,.11,.19,.3,.43,1];
  return [ mk(3,-1,-.15,40,8.2,.45,.5,2.6,FV,.62,[.83,.9],0), mk(8.6,-1,.12,38,11.5,.26,.62,3.4,HV,.44,[.84,.91],1),
           mk(3, 1,-.15,40,8.2,.45,.5,2.6,FV,.62,[.83,.9],0), mk(8.6, 1,.12,38,11.5,.26,.62,3.4,HV,.44,[.84,.91],1) ];
}
/* the crop: the insect is drawn in its own units and seen at DF_Z of them per tile unit, thorax a little up and right of centre */
const DF_Z=1.55, DF_OX=21.5, DF_OY=8.9;
function paintDragonfly(S){
  const k=S/100*DF_Z, im=new Uint8ClampedArray(S*S*4), pxU=1/k, WG=dfWings();
  let Lx=-.5, Ly=-.6, Lz=.62; { const m=Math.hypot(Lx,Ly,Lz); Lx/=m; Ly/=m; Lz/=m; }
  let Hx=Lx, Hy=Ly, Hz=Lz+1; { const m=Math.hypot(Hx,Hy,Hz); Hx/=m; Hy/=m; Hz/=m; }
  const HC=[67.4,26.2], E1=[HC[0]-1.4,HC[1]-1.12], E2=[HC[0]+1.4,HC[1]+1.12], ER=3.6;
  for(let y=0;y<S;y++) for(let x=0;x<S;x++){
    const ux=DF_OX+(x+.5)/k, uy=DF_OY+(y+.5)/k, tx=(x+.5)/S*100, ty=(y+.5)/S*100, j=(y*S+x)*4;
    /* out of focus behind: reeds and water, lit from the upper left; one soft stem (placed in tile units) */
    const d=clamp((tx*.5+ty*.8)/118);
    let r=lerp(136,30,d), g=lerp(142,48,d), b=lerp(104,38,d);
    const st=Math.exp(-Math.pow((tx-14+ty*.3)/5,2))*.4*clamp(1-ty/120);
    r+=st*34; g+=st*38; b+=st*22;
    /* the wings: clear membrane, a faint smoky sheen, veins; the hind pair amber at the root */
    for(const w of WG){
      const px0=ux-w.rx, py0=uy-w.ry, s=(px0*w.dx+py0*w.dy)/w.L, yy=w.flip*(-px0*w.dy+py0*w.dx);
      if(s<-.02||s>1) continue;
      const yL=s>.8?w.hl*(1-Math.sqrt(Math.max(0,1-Math.pow((s-.8)/.2,2)))):0;
      const yT=s<w.c?w.Wmax*(1-(1-w.b0)*Math.pow((w.c-s)/w.c,2)):w.hl+(w.Wmax-w.hl)*Math.sqrt(Math.max(0,1-Math.pow((s-w.c)/(1-w.c),2)));
      if(yy<yL-.4||yy>yT+.4) continue;
      const wid=Math.max(.5,yT-yL), q=(yy-yL)/wid, inside=sstep(-pxU*.6,pxU*.6,yy-yL)*sstep(-pxU*.6,pxU*.6,yT-yy)*sstep(-.02,.01,s);
      if(inside<=0) continue;
      const sheen=Math.exp(-Math.pow((s-.5-q*.15)/.16,2))*.55;
      const mA=(.1+sheen*.2)*inside;
      r=lerp(r,lerp(214,196,s),mA); g=lerp(g,lerp(196,204,s),mA); b=lerp(b,lerp(150,206,s),mA);
      if(w.amber){ const am=clamp(1-s/.17)*clamp(q*3)*.55*inside; r=lerp(r,196,am); g=lerp(g,128,am); b=lerp(b,40,am); }
      let vd=1e9, vt=.15; const u=s*w.L, nv=w.veins.length;
      for(let n=0;n<nv;n++){ if(w.veins[n]>w.netFrom&&n<nv-1) continue; const qq=w.veins[n]+(n>0&&n<nv-1?.01*Math.sin(s*8+n):0);
        const dd=Math.abs(q-qq)*wid, tt=n===0?.42:n===nv-1?.22:.17; if(dd-tt/2<vd-vt/2){ vd=dd; vt=tt; } }
      if(q<w.netFrom){ let n=0; while(n<nv-2&&q>w.veins[n+1]) n++;
        const lo=w.veins[n], sp=1.25+n*.18, uu=u+.35*(q-lo)*wid, j0=Math.floor(uu/sp);
        for(let jj=j0-1;jj<=j0+1;jj++){ const cpos=(jj+.25+.5*hash(jj*13.1+n*71.7+w.L,3))*sp, dd=Math.abs(uu-cpos)*.95; if(dd-.07<vd-vt/2){ vd=dd; vt=.13; } }
      } else { const cs=1.7, X=u/cs, Y=yy/cs, gx=Math.floor(X), gy=Math.floor(Y); let f1=1e9,f2=1e9;
        for(let a=-1;a<=1;a++) for(let bq=-1;bq<=1;bq++){ const cx=gx+a, cy=gy+bq, fx=cx+.15+.7*hash(cx*12.9+cy*78.2+w.L,5), fy=cy+.15+.7*hash(cx*39.3+cy*11.7+w.L,6);
          const dd=Math.hypot(X-fx,Y-fy); if(dd<f1){ f2=f1; f1=dd; } else if(dd<f2) f2=dd; }
        const dd=(f2-f1)*cs*.5; if(dd-.07<vd-vt/2){ vd=dd; vt=.13; } }
      const cov=(1-sstep(vt/2-pxU*.55,vt/2+pxU*.55,vd))*inside;
      const stig=(s>w.stig[0]&&s<w.stig[1]&&q<w.veins[2])?sstep(0,pxU,Math.min(s-w.stig[0],w.stig[1]-s)*w.L)*sstep(0,pxU,(w.veins[2]-q)*wid):0;
      const tone=clamp(1-s*2.2);
      r=lerp(r,lerp(30,70,tone),cov*.9); g=lerp(g,lerp(24,46,tone),cov*.9); b=lerp(b,lerp(18,20,tone),cov*.9);
      r=lerp(r,40,stig*.95); g=lerp(g,24,stig*.95); b=lerp(b,12,stig*.95);
    }
    /* the body: thorax and the long abdomen, each a lit tube; segments ringed dark, yellow marks along the sides */
    const ox=ux-DF.H[0], oy=uy-DF.H[1], s=ox*DF.A[0]+oy*DF.A[1], rr=ox*DF.Pp[0]+oy*DF.Pp[1];
    let rad=0, part=0;
    if(s>=-.6&&s<=11){ rad=4.1*Math.sqrt(Math.max(0,1-Math.pow((s-5.2)/5.9,2))); part=1; }
    if(s>10&&s<=63){ const seg0=(s-10.5)/5.25, f=seg0-Math.floor(seg0), base=s<15?lerp(2.3,1.45,(s-10)/5):s<58?1.45+.22*Math.sin(Math.PI*(s-15)/43):1.45*Math.sqrt(Math.max(0,1-Math.pow((s-58)/5.2,2)));
      const ra=base*(1+.06*Math.sin(f*Math.PI)); if(ra>rad||part===0){ if(Math.abs(rr)<ra){ rad=ra; part=2; } } }
    if(part&&Math.abs(rr)<rad+pxU){
      const cov=sstep(-pxU*.7,pxU*.7,rad-Math.abs(rr)), t=clamp(rr/rad,-1,1), nz=Math.sqrt(Math.max(0,1-t*t));
      const nx=t*DF.Pp[0], ny=t*DF.Pp[1], dl=clamp((nx*Lx+ny*Ly+nz*Lz+.15)/1.15), spc=Math.pow(Math.max(0,nx*Hx+ny*Hy+nz*Hz),36);
      let cr,cg,cb;
      if(part===1){ const stripe=Math.abs(((s*.9+rr*.55)%3.4+3.4)%3.4-1.7)<.42&&Math.abs(rr)<rad*.8; cr=stripe?132:70; cg=stripe?116:58; cb=stripe?66:32; }
      else { const seg0=(s-10.5)/5.25, f=seg0-Math.floor(seg0), at=Math.abs(t);
        cr=56; cg=40; cb=22;
        if(f>.18&&f<.62&&at>.5&&at<.9){ cr=164; cg=126; cb=58; }
        if(at<.12){ cr*=.65; cg*=.65; cb*=.65; }
        if(f<.07){ cr=24; cg=17; cb=11; } }
      const lit=.28+.86*dl;
      r=lerp(r,cr*lit+spc*110,cov); g=lerp(g,cg*lit+spc*104,cov); b=lerp(b,cb*lit+spc*92,cov);
    }
    /* the head: the two big compound eyes meet along the top, so it reads as one wide dome with a seam; dark amber, finely
       mottled, one small sharp highlight each */
    { let best=null;
      for(const e of [E1,E2]){ const dx=ux-e[0], dy=uy-e[1], da=(dx*DF.A[0]+dy*DF.A[1])/(ER*.82), dp=(dx*DF.Pp[0]+dy*DF.Pp[1])/(ER*1.06), dd=Math.hypot(da,dp); if(dd>1+pxU/ER) continue;
        const nx=da*DF.A[0]+dp*DF.Pp[0], ny=da*DF.A[1]+dp*DF.Pp[1], nz=Math.sqrt(Math.max(0,1-dd*dd)); if(!best||nz>best.nz) best={nx,ny,nz,cov:sstep(-pxU*.7,pxU*.7,(1-dd)*ER*.82)}; }
      if(best){ const {nx,ny,nz}=best, cov=Math.max(best.cov, 0);
        const dl=clamp((nx*Lx+ny*Ly+nz*Lz+.2)/1.2), spc=Math.pow(Math.max(0,nx*Hx+ny*Hy+nz*Hz),90);
        const mott=(vn2(ux*3.2,uy*3.2,17)-.5)*.3+(vn2(ux*7,uy*7,18)-.5)*.18, front=clamp(.5+(nx*DF.A[0]+ny*DF.A[1])*.8);
        const cr=lerp(58,104,front)*(1+mott), cg=lerp(40,74,front)*(1+mott), cb=lerp(26,40,front)*(1+mott);
        const lit=.3+.8*dl, seam=1-.5*Math.exp(-Math.pow((((ux-HC[0])*DF.Pp[0]+(uy-HC[1])*DF.Pp[1]))/.22,2));
        r=lerp(r,(cr*lit+spc*190)*seam,cov); g=lerp(g,(cg*lit+spc*180)*seam,cov); b=lerp(b,(cb*lit+spc*166)*seam,cov); } }
    im[j]=r; im[j+1]=g; im[j+2]=b; im[j+3]=255;
  }
  return im;
}
function buildSharp(){
  if(buildSharp.cache) return buildSharp.cache;
  const S2=SH_W*2, big=paintDragonfly(S2), W=SH_W, frame=new Uint8ClampedArray(W*W*4);
  /* the camera's pixels: each the mean of four drawn ones, plus a faint sensor noise */
  for(let y=0;y<W;y++) for(let x=0;x<W;x++){ const o=(y*W+x)*4, nz=(hash(o*.37+1.3,21)-.5)*2.2; for(let c=0;c<3;c++){ let s=0; for(let a=0;a<2;a++) for(let b=0;b<2;b++) s+=big[((2*y+a)*S2+2*x+b)*4+c]; frame[o+c]=s/4+nz; } frame[o+3]=255; }
  const src=e1BoxBlur(frame,W,W,SH_SOFT), out=sharpenFx(src,W,W,SH_AMT,SH_R);
  return buildSharp.cache={W,src,out,SRC:toCanvas(W,W,src),OUT:toCanvas(W,W,out)};
}

window.FX_TILES.push({ id:'sharpen', name:'Sharpen', section:'Blur', isNew:true, still:2.6,
  line:'Soft edges turn crisp and the fine veins in the wings come back, each edge gaining a thin light rim and a dark one.',
  _proof(){ const b=buildSharp(); return {W:b.W, src:b.src, out:b.out, type:'sharpen', params:{amount:SH_AMT,radius:SH_R}}; },
  make(px){
    const P=4.4, B=buildSharp();
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      /* soft, then the sharpening switched on (a hard cut), held, and off again */
      const on=u>=1.3&&u<3.75;
      c.drawImage(on?B.OUT:B.SRC,0,0,100,100);
    };
  } });

})();
