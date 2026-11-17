/* round 5 slot 10: CUBE, a layer per face (#1246 U11; the effect type is cube3d, effects branch commits bde43e8b + 13303ee8).
   Ezra (10 Nov): "The old cube looked better as well because it had like different stuff on each side. I think just a random
   picture of a McLaren like that is kind of weird." The old idea is TRUE now: the front is the layer the Cube sits on and the
   Back / Right / Left / Top / Bottom pickers each put their own layer on that face. So here six pictures, painted in code (no
   photographs), are six layers: a coast (the front, this layer), a city at night (left), snow peaks (back), dunes (right),
   and two drone shots for the top (forest) and bottom (lagoon), which a cube shows at any angle.
   The drawing is renderMesh's own: bBox(0.72) at 3 x 3 quads a face, Rotate X then Y, weak perspective F 3.2 (Perspective 50),
   flat Lambert at Shading 0.6 with the key light from 53 deg, each triangle an affine map of its face's picture; Size 70 of a
   full-frame layer. Rotate X stays at its default 25; Rotate Y is keyed a quarter turn at a time (eased in and out, held 0.8 s)
   through 45 / 135 / 225 / 315, so each hold shows three faces and a turn shows all six. cubeParams is exactly what the truth
   probe (probe-cube.js) hands the real renderer, so the keyframes cannot drift from the picture. No outline, gloss band,
   specular or floor shadow: the effect draws none of them. */
(function(){ 'use strict';
const {clamp,lerp,rng}=window.FXK;
const NAVY='#161c28', DIM='#8b96a8', YEL='#ffce4a', TEAL='#29d9bb';

/* ---- value noise, deterministic ---- */
function h2(x,y,s){ let h=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(s|0,982451653))|0; h=Math.imul(h^(h>>>13),1274126177); h^=h>>>16; return (h>>>0)/4294967296; }
function n2(x,y,s){ const ix=Math.floor(x), iy=Math.floor(y); let fx=x-ix, fy=y-iy; fx=fx*fx*(3-2*fx); fy=fy*fy*(3-2*fy); const a=h2(ix,iy,s), b=h2(ix+1,iy,s), c=h2(ix,iy+1,s), d=h2(ix+1,iy+1,s); return a+(b-a)*fx+(c-a)*fy+(a-b-c+d)*fx*fy; }
function fb(x,y,s,o){ let v=0, a=.5, n=0; for(let i=0;i<o;i++){ v+=a*n2(x,y,s+i*101); n+=a; x=x*2.03+17.1; y=y*2.03+9.7; a*=.5; } return v/n; }
/* ridged: sharp crests where the noise crosses its middle (rock ribs, aretes) */
function rf(x,y,s,o){ let v=0, a=.5, n=0, w=1; for(let i=0;i<o;i++){ let r=1-Math.abs(2*n2(x,y,s+i*101)-1); r=r*r*w; w=clamp(r*1.6); v+=a*r; n+=a; x=x*2.07+17.1; y=y*2.07+9.7; a*=.5; } return v/n; }
const ss=(a,b,x)=>{ const t=clamp((x-a)/(b-a)); return t*t*(3-2*t); };
const set=(o,r,g,b)=>{ o[0]=r; o[1]=g; o[2]=b; };
const mix=(o,r,g,b,k)=>{ o[0]+=(r-o[0])*k; o[1]+=(g-o[1])*k; o[2]+=(b-o[2])*k; };
const mul=(o,m)=>{ o[0]*=m; o[1]*=m; o[2]*=m; };
/* A picture that prepares a lot in make() prepares it as a generator instead (#1253, 17 Nov; HARNESS.md "is staged"). stage(gen) runs
   it to the end at once (finish) or a few milliseconds at a time (step(ms), true once it is done). make() hands back its draw function
   with draw.step, so the app builds it between frames; a draw before it is done finishes it there and then, which is exactly what
   make() used to do. Every yield is only a place the work may pause: no number changes. */
const stage=gen=>{ let done=false, val, last='';
  const run=ms=>{ if(done) return true; const t0=performance.now();
    for(;;){ const r=gen.next(); if(r.done){ done=true; val=r.value; return true; } last=r.value; if(performance.now()-t0>=ms) return false; } };
  return { step:ms=>run(Math.max(0,+ms||0)), finish:()=>{ run(Infinity); return val; }, done:()=>done, last:()=>last }; };
const drain=g=>{ let r; do r=g.next(); while(!r.done); return r.value; };
/* a picture from a per-pixel painter (u, v in 0..1, v down), with a little film grain */
function* plateG(S,seed,fn){
  const C=document.createElement('canvas'); C.width=C.height=S;
  const g=C.getContext('2d'), im=g.createImageData(S,S), d=im.data, o=[0,0,0];
  let i=0;
  for(let y=0;y<S;y++){ const v=(y+.5)/S; for(let x=0;x<S;x++){ const u=(x+.5)/S; fn(u,v,o); const gr=(h2(x,y,seed)-.5)*6; d[i]=o[0]+gr; d[i+1]=o[1]+gr; d[i+2]=o[2]+gr; d[i+3]=255; i+=4; } if((y&3)===3) yield 'plate'; }
  g.putImageData(im,0,0); return C;
}
function plate(S,seed,fn){ return drain(plateG(S,seed,fn)); }

/* ---- the six layers ---- */
/* FRONT (this layer): a sea cliff under an overcast sky, long swells, white water at the cliff foot */
function coast(u,v,o){
  const HZ=.44;
  if(v<HZ){ const k=v/HZ; set(o,lerp(132,200,k),lerp(147,207,k),lerp(162,212,k)); const cl=fb(u*1.8+.5*fb(u,v*3,12,2),v*5.5,11,5); mul(o,.84+.26*cl); mix(o,226,230,232,.25*ss(.6,.75,cl)*(1-k)); }
  else {
    const z=(v-HZ)/(1-HZ), d=Math.pow(z,.5); set(o,lerp(124,24,d),lerp(140,58,d),lerp(146,66,d));
    const gz=.06/(v-HZ+.006), gx=(u-.5)*gz;
    const sw=Math.sin(gz*9+6.6*fb(gx*.8,gz*.6,24,3));
    mul(o,.88+.1*sw+(.24+.16*z)*(fb(gx*1.6,gz*6,21,4)-.5));
    mix(o,218,226,230,.6*ss(.68,.82,fb(gx*3,gz*10,23,3))*ss(0,.3,z));
  }
  /* the headland: its cliff end lit, a grass cap, hazed by distance */
  if(u>.5){
    const top=HZ-.205*ss(.5,.6,u)-.03*ss(.6,1,u)+.022*(fb(u*8,1.3,31,3)-.5)*ss(.5,.62,u), base=HZ+.034+.012*u;
    if(v>top&&v<base){ const t1=fb(u*26,v*14,33,4); set(o,44+46*t1,47+46*t1,46+42*t1); if(u<.6) mul(o,1.2); if(v<top+.024) mix(o,72,96,56,.85*(1-ss(top+.012,top+.024,v))); mix(o,170,180,186,.24); }
    const dv=Math.abs(v-base); if(dv<.016) mix(o,228,233,235,.92*(1-dv/.016)*ss(.4,.64,fb(u*40,v*80,35,3)));
  }
}
/* LEFT: a city across the water at night */
function cityOf(S){
  const R=rng(1301), B=[]; let x=-.03;
  while(x<1.03){ const w=.05+.075*R(); B.push({x0:x,x1:x+w,top:.34+.24*R(),lit:.18+.34*R(),s:(R()*1e6)|0,set:R()<.4?{w:w*(.35+.3*R()),h:.025+.05*R()}:null}); x+=w+.006*R(); }
  /* two towers that make the skyline, off-centre */
  let best=0, bd=9; B.forEach((b,i)=>{ const d=Math.abs((b.x0+b.x1)/2-.3); if(d<bd){ bd=d; best=i; } }); B[best].top=.15; B[best].set={w:(B[best].x1-B[best].x0)*.45,h:.05};
  bd=9; let b2=0; B.forEach((b,i)=>{ const d=Math.abs((b.x0+b.x1)/2-.68); if(d<bd){ bd=d; b2=i; } }); B[b2].top=.22; B[b2].set=null;
  const col=new Int16Array(S+2).fill(-1);
  for(let i=0;i<=S+1;i++){ const u=(i+.5)/S; for(let k=0;k<B.length;k++) if(u>=B[k].x0&&u<B[k].x1){ col[i]=k; break; } }
  const WL=.73;
  function city(u,v,o){
    set(o,lerp(24,80,clamp(v/WL)),lerp(38,100,clamp(v/WL)),lerp(72,140,clamp(v/WL)));   // blue hour: the sky still holds some light
    mul(o,.94+.1*fb(u*3,v*5,91,3));
    const ci=col[clamp(Math.floor(u*S),0,S+1)];
    if(ci<0) return;
    const b=B[ci], cx=(b.x0+b.x1)/2;
    let top=b.top; if(b.set&&Math.abs(u-cx)>b.set.w/2) top+=b.set.h;
    if(ci===best&&Math.abs(u-cx)<.0035&&v>b.top-.06) { set(o,20,24,34); return; }   // the mast
    if(v<top) return;
    const sh=.92+.16*h2(ci,3,77); set(o,11*sh,15*sh,27*sh);
    mix(o,40,52,80,.25*(1-ss(top,top+.12,v)));
    const cw=.0155, ch=.021, fu=(u-b.x0)/cw, fv=(v-top-.012)/ch, cc=Math.floor(fu), rr=Math.floor(fv);
    if(fv>0&&u>b.x0+.006&&u<b.x1-.006){
      const ax=fu-cc, ay=fv-rr;
      if(ax>.22&&ax<.78&&ay>.28&&ay<.74){
        const hh=h2(cc+b.s,rr,13);
        if(hh<b.lit){ const it=.55+.45*h2(cc,rr+b.s,17); if(h2(cc,rr,b.s)<.18) set(o,170*it,196*it,235*it); else set(o,250*it,206*it,146*it); }
        else set(o,18,24,38);
      }
    }
  }
  return function(u,v,o){
    if(v<WL){ city(u,v,o); return; }
    const vv=WL-(v-WL)*1.3-.004, uu=u+.006*(n2(v*110,u*3,7)-.5);
    city(uu,Math.max(.001,vv),o);
    const m=.5*(.62+.5*n2(u*5,v*170,9)); set(o,6+o[0]*m,10+o[1]*m,18+o[2]*m);
    if(Math.abs(v-WL)<.003) mul(o,.7);
  };
}
/* BACK: an alpine massif in clear air: snow in the couloirs, dark rock ribs, its east faces in blue shadow, a forest below */
function ridgeAt(u){ const m=Math.max(1-Math.abs(u-.38)/.40,.62*(1-Math.abs(u-.84)/.26),0); return .70-.50*Math.pow(m,1.15)-.045*(fb(u*5,2.9,45,4)-.5)-.02*(rf(u*18,4.1,46,3)-.4); }
/* the face as a relief: an arete down from each summit (lit to its west, shadowed to its east), ribs and couloirs on it */
function relief(u,v){ const sp=(u<.62?.38:.84)+.2*(v-.2); return 1.7*-Math.abs(u-sp)+.2*rf((u+.12*fb(u*2,v*2,48,2))*8,v*4,49,5)-.5*v; }
function pines(u,v,base){ const N=52, i0=Math.floor(u*N); for(let i=i0-1;i<=i0+1;i++){ const c=(i+.5+.5*(h2(i,7,57)-.5))/N, H=.035+.06*h2(i,9,57); if(v>base-H+Math.abs(u-c)/.32) return true; } return v>base+.01; }
/* the column-only terms (ridge lines, the treeline's base) once per column, not once per pixel */
function peaksOf(S){
  const RG=new Float64Array(S), FAR=new Float64Array(S), PB=new Float64Array(S);
  for(let x=0;x<S;x++){ const u=(x+.5)/S; RG[x]=ridgeAt(u); FAR[x]=.53-.05*fb(u*2.6,1.7,41,4); PB[x]=.86+.035*(fb(u*4,3.3,53,3)-.5); }
  return (u,v,o)=>peaks(u,v,o,clamp(Math.floor(u*S),0,S-1),RG,FAR,PB);
}
function peaks(u,v,o,x,RG,FAR,PB){
  set(o,lerp(58,180,clamp(v/.62)),lerp(104,203,clamp(v/.62)),lerp(166,228,clamp(v/.62)));
  if(v>FAR[x]){ set(o,162,180,202); mix(o,214,224,236,.5*ss(.5,.62,fb(u*9,v*12,43,3))); }
  const r=RG[x];
  if(v>r){
    const e=.004, g0=relief(u,v), gx=(relief(u+e,v)-g0)/e, gy=(relief(u,v+e)-g0)/e;
    let nx=-gx, ny=-gy, nz=1.5; const nl=Math.hypot(nx,ny,nz); nx/=nl; ny/=nl; nz/=nl;
    const L=ss(.3,.72,clamp(-.62*nx-.42*ny+.66*nz));      // sun from the upper left
    const snow=ss(1.05,.75,Math.abs(gx)*.55+.35*(rf(u*22,v*10,50,3)-.35));
    const tx=.93+.12*fb(u*60,v*60,51,2);
    set(o,lerp(lerp(42,112,L)*tx,lerp(126,246,L),snow),lerp(lerp(46,106,L)*tx,lerp(148,248,L),snow),lerp(lerp(62,104,L)*tx,lerp(188,252,L),snow));
    mix(o,170,186,206,.42*ss(.5,.84,v));
  }
  if(pines(u,v,PB[x])){ const k=n2(u*90,v*50,55); set(o,13+9*k,22+11*k,23+7*k); mul(o,1-.2*ss(.86,1,v)); }
  else if(v>.78&&v>r) mix(o,196,206,218,.3*ss(.78,.86,v));   // valley haze over the trees' tops
}
/* RIGHT: dunes, low sun from the left, the slip faces in shadow */
function dunes(u,v,o){
  const k=clamp(v/.42); set(o,lerp(150,222,k),lerp(172,212,k),lerp(194,196,k));
  const r0=.40-.035*fb(u*3,.5,61,3);
  if(v>r0){ const w=Math.sin(u*19+3*fb(u*2,v*4,62,3)); set(o,206,186,160); if(w>.35) mix(o,178,160,146,.6*ss(.35,.6,w)); mix(o,214,206,192,.35*(1-ss(r0,r0+.1,v))); }
  const dune=(cu,cv,amp,wid,seed,slope)=>{
    const c=cv-amp*Math.exp(-Math.pow((u-cu)/wid,2))+.016*(fb(u*5,1.1,seed,3)-.5);
    if(v<=c) return false;
    const vp=cv-amp, xs=cu+slope*(v-vp)+.02*(fb(v*6,2,seed+1,3)-.5);
    if(u<xs){ const f=ss(c,c+.2,v); set(o,lerp(230,200,f),lerp(198,162,f),lerp(156,122,f)); mul(o,1+.045*Math.sin((u*1+v*2.2)*170+8*fb(u*3,v*3,seed+2,2))); if(xs-u<.006) mix(o,246,226,196,.5); }
    else { const g=ss(xs,xs+.3,u); set(o,lerp(92,128,g),lerp(72,100,g),lerp(66,84,g)); mul(o,.94+.08*fb(u*12,v*12,seed+3,2)); }
    return true;
  };
  dune(.66,.52,.13,.24,63,.95);
  dune(.26,.70,.17,.30,65,1.15);
}
/* TOP: a drone shot of forest with a river through it */
function forest(u,v,o){
  const n=fb(u*16,v*16,71,4), e=.005, nx=fb((u+e)*16,v*16,71,4), ny=fb(u*16,(v+e)*16,71,4);
  const lit=clamp(.5+(n-nx)*20+(n-ny)*20);
  set(o,lerp(16,74,lit),lerp(34,104,lit),lerp(24,58,lit));
  mul(o,.7+.5*ss(.3,.62,n));
  mix(o,96,112,60,.22*ss(.56,.7,fb(u*5,v*5,73,3)));
  const d=Math.abs(v-(.2+.55*u+.075*Math.sin(u*7.5+1)+.02*(fb(u*6,.3,74,3)-.5))), rw=.026+.008*n2(u*4,.7,76);
  if(d<rw+.008){ mix(o,30,40,30,.5*ss(rw+.008,rw,d)); if(d<rw){ const w=ss(rw,rw-.006,d); mix(o,44,66,74,w); mix(o,92,118,124,w*.35*n2(u*50,v*50,75)); } }
}
/* BOTTOM: a drone shot of a lagoon meeting the sand */
function lagoon(u,v,o){
  const s=u*.62+v*.55+.07*(fb(u*3.5,v*3.5,81,4)-.5);
  if(s<.6){ set(o,224,212,188); mul(o,.94+.08*fb(u*30,v*30,85,3)); mix(o,186,170,146,.5*ss(.5,.6,s)); return; }
  const dp=clamp((s-.62)/.5); set(o,lerp(92,14,dp),lerp(190,72,dp),lerp(184,104,dp));
  mul(o,.9+.18*fb(u*24,v*24,83,3));
  const fo=Math.abs(s-.615); if(fo<.012) mix(o,236,240,238,.85*(1-fo/.012)*ss(.35,.6,fb(u*30,v*30,87,3)));
}
const TEX=256;   /* painted once per page (about a third of a second), then shared by every make() */
let ART=null;
function* faceArtG(S){
  S=S||TEX;
  if(ART&&ART.S===S) return ART.faces;
  const faces={};
  faces.front=(yield* plateG(S,201,coast)); faces.back=(yield* plateG(S,202,peaksOf(S))); faces.right=(yield* plateG(S,203,dunes));
  faces.left=(yield* plateG(S,204,cityOf(S))); faces.top=(yield* plateG(S,205,forest)); faces.bottom=(yield* plateG(S,206,lagoon));
  ART={S,faces}; return faces;
}
function faceArt(S){ return drain(faceArtG(S)); }
let artStage=null;
const artSt=()=>artStage||(artStage=stage(faceArtG(TEX)));

/* ---- Rotate Y, keyed: what the real effect is given (cubeParams) and what the tile evaluates, the app's own way ---- */
const KEYS=[{t:0,v:0},{t:.3,v:45,e:'easeOut'},{t:1.1,v:45,e:'linear'},{t:1.7,v:135,e:'easeInOut'},{t:2.5,v:135,e:'linear'},{t:3.1,v:225,e:'easeInOut'},{t:3.9,v:225,e:'linear'},{t:4.5,v:315,e:'easeInOut'},{t:5.3,v:315,e:'linear'},{t:5.6,v:360,e:'easeIn'}];
/* 360 and 0 are one angle: the last turn, 315 to 405, is keyed as 315 -> 360 (ease in) and 0 -> 45 (ease out), which together
   are exactly one ease-in-out turn, and every value stays inside Rotate Y's 0..360. Loop: cycle. */
const EASE={linear:f=>f,easeIn:f=>f*f,easeOut:f=>1-(1-f)*(1-f),easeInOut:f=>f<.5?2*f*f:1-Math.pow(-2*f+2,2)/2};
function rotY(t){
  const lo=KEYS[0].t, hi=KEYS[KEYS.length-1].t, span=hi-lo;
  if(t>hi) t=lo+((t-lo)%span);
  if(t<=lo) return KEYS[0].v;
  for(let i=0;i<KEYS.length-1;i++){ const a=KEYS[i], b=KEYS[i+1]; if(t>=a.t&&t<=b.t){ const f=(t-a.t)/(b.t-a.t); return a.v+(b.v-a.v)*EASE[b.e](f); } }
  return KEYS[KEYS.length-1].v;
}
const RX=25, SIZE=70, SHADING=.6, F3=3.2;

/* ---- the mesh: bBox(0.72, 0.72, 0.72, 3), faces in its order: front, back, right, left, top, bottom ---- */
const MESH=(()=>{ const w=.72, sub=3, V=[], T=[];
  const face=(ox,oy,oz,ux,uy,uz,vx,vy,vz)=>{ const b=V.length; for(let j=0;j<=sub;j++) for(let i=0;i<=sub;i++){ const fu=i/sub, fv=j/sub; V.push([ox+ux*fu+vx*fv,oy+uy*fu+vy*fv,oz+uz*fu+vz*fv,fu,fv]); } for(let j=0;j<sub;j++) for(let i=0;i<sub;i++){ const k=b+j*(sub+1)+i; T.push([k,k+1,k+sub+2],[k,k+sub+2,k+sub+1]); } };
  face(-w,-w,w,2*w,0,0,0,2*w,0); face(w,-w,-w,-2*w,0,0,0,2*w,0); face(w,-w,w,0,0,-2*w,0,2*w,0); face(-w,-w,-w,0,0,2*w,0,2*w,0); face(-w,-w,-w,2*w,0,0,0,0,2*w); face(-w,w,w,2*w,0,0,0,0,-2*w);
  return {V,T}; })();
const ORDER=['front','back','right','left','top','bottom'];

window.FX_TILES.push({ id:'cube', name:'Cube', section:'3D', redrawn:true, still:3.5,
  line:'A layer on every face: Back, Right, Left, Top and Bottom each set to a layer of its own, Rotate Y keyed a quarter turn at a time, the rest at the defaults.',
  cubeParams:{rotx:RX,roty:{kf:KEYS,loopMode:'cycle'},rotz:0,size:SIZE,shading:SHADING,light:53,persp:50},
  cubeBg:NAVY, faceArt, TEX,
  make(px){
    const stg=artSt(), n=MESH.V.length; let tex=null;
    const P=new Array(n), X3=new Float64Array(n), Y3=new Float64Array(n), Z3=new Float64Array(n);
    const cX=Math.cos(RX*Math.PI/180), sX=Math.sin(RX*Math.PI/180), R=px/2*SIZE/100, cx=px/2, cy=px/2, Lx=.42, Ly=-.55, Lz=.72;
    const sc=px/100;
    const draw=(c,t)=>{
      if(!tex){ const art=stg.finish(); tex=ORDER.map(k=>art[k]); }
      const deg=rotY(t), ry=deg*Math.PI/180, cY=Math.cos(ry), sY=Math.sin(ry);
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; c.filter='none';
      c.fillStyle=NAVY; c.fillRect(0,0,px,px);
      for(let i=0;i<n;i++){ const v=MESH.V[i]; let x=v[0], y=v[1], z=v[2], w; w=y*cX-z*sX; z=y*sX+z*cX; y=w; w=x*cY+z*sY; z=-x*sY+z*cY; x=w; X3[i]=x; Y3[i]=y; Z3[i]=z; const f=F3/Math.max(.2,F3-z); P[i]=[cx+x*f*R,cy+y*f*R]; }
      c.imageSmoothingEnabled=true; c.imageSmoothingQuality='high';
      for(let k=0;k<MESH.T.length;k++){
        const tr=MESH.T[k], a=P[tr[0]], b=P[tr[1]], d=P[tr[2]];
        if((b[0]-a[0])*(d[1]-a[1])-(b[1]-a[1])*(d[0]-a[0])<=0) continue;   // facing away
        const T=tex[(k/18)|0], TW=T.width, TH=T.height;
        const gx=(a[0]+b[0]+d[0])/3, gy=(a[1]+b[1]+d[1])/3;
        const q=[a,b,d].map(p=>{ const dx=p[0]-gx, dy=p[1]-gy, l=Math.hypot(dx,dy)||1; return [p[0]+dx/l*.45,p[1]+dy/l*.45]; });
        const va=MESH.V[tr[0]], vb=MESH.V[tr[1]], vc=MESH.V[tr[2]], u0=va[3]*TW, v0=va[4]*TH, u1=vb[3]*TW, v1=vb[4]*TH, u2=vc[3]*TW, v2=vc[4]*TH;
        const den=u0*(v1-v2)+u1*(v2-v0)+u2*(v0-v1); if(Math.abs(den)<1e-6) continue;
        const x0=q[0][0], y0=q[0][1], x1=q[1][0], y1=q[1][1], x2=q[2][0], y2=q[2][1];
        const ma=(x0*(v1-v2)+x1*(v2-v0)+x2*(v0-v1))/den, mb=(y0*(v1-v2)+y1*(v2-v0)+y2*(v0-v1))/den, mc=(x0*(u2-u1)+x1*(u0-u2)+x2*(u1-u0))/den, md=(y0*(u2-u1)+y1*(u0-u2)+y2*(u1-u0))/den, me=x0-ma*u0-mc*v0, mf=y0-mb*u0-md*v0;
        const e1x=X3[tr[1]]-X3[tr[0]], e1y=Y3[tr[1]]-Y3[tr[0]], e1z=Z3[tr[1]]-Z3[tr[0]], e2x=X3[tr[2]]-X3[tr[0]], e2y=Y3[tr[2]]-Y3[tr[0]], e2z=Z3[tr[2]]-Z3[tr[0]];
        const nx=e1y*e2z-e1z*e2y, ny=e1z*e2x-e1x*e2z, nz=e1x*e2y-e1y*e2x, nl=Math.hypot(nx,ny,nz)||1;
        const shade=(1-SHADING)+SHADING*(.25+.75*Math.abs((nx*Lx+ny*Ly+nz*Lz)/nl));
        c.save(); c.beginPath(); c.moveTo(x0,y0); c.lineTo(x1,y1); c.lineTo(x2,y2); c.closePath(); c.clip();
        c.setTransform(ma,mb,mc,md,me,mf); c.drawImage(T,0,0);
        if(shade<.999){ c.fillStyle='rgba(0,0,0,'+(1-shade).toFixed(4)+')'; c.fillRect(0,0,TW,TH); }
        c.restore();
      }
      /* furniture, in the one corner the turning cube never reaches at Size 70: Rotate Y's dial, its four keys as yellow
         diamonds, the handle in teal at the angle the cube is drawn at */
      c.setTransform(sc,0,0,sc,0,0);
      const DX=89.5, DY=89.5, DR=6.2, ang=d0=>(d0-90)*Math.PI/180;
      c.strokeStyle=DIM; c.lineWidth=.5; c.beginPath(); c.arc(DX,DY,DR,0,Math.PI*2); c.stroke();
      c.fillStyle=YEL; for(const kd of [45,135,225,315]){ const r=ang(kd), x=DX+Math.cos(r)*DR, y=DY+Math.sin(r)*DR; c.beginPath(); c.moveTo(x,y-1.6); c.lineTo(x+1.6,y); c.lineTo(x,y+1.6); c.lineTo(x-1.6,y); c.closePath(); c.fill(); }
      const r=ang(deg); c.strokeStyle=TEAL; c.lineWidth=.6; c.beginPath(); c.moveTo(DX,DY); c.lineTo(DX+Math.cos(r)*DR,DY+Math.sin(r)*DR); c.stroke();
      c.fillStyle=TEAL; c.fillRect(DX+Math.cos(r)*DR-1,DY+Math.sin(r)*DR-1,2,2);
      c.setTransform(1,0,0,1,0,0);
    };
    draw.step=stg.step; draw.stage=stg;
    return draw;
  }
});
})();
