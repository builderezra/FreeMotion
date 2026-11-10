/* FreeMotion effect pictures, artist 23 (c23): Depth Push, Ring, Spiked Star, Star Column, Torus, Odometer Roll, Text Curve.
   No photographs. The five solids run a port of the app's own renderMesh (js/compositor.js): the same mesh builders
   (bParam, bPrism, bTube, bOcta), the same X-then-Y-then-Z rotation, weak perspective at F 3.2, painter's sort on summed z,
   0.4 px inflation, the affine texture map per triangle and the same flat double-sided Lambert shade, on artwork made here. */
(function(){ 'use strict';
const {TAU,clamp,lerp,seg,E,rng,hash,vnoise,canvasOf}=window.FXK;

const BONE='#e7e2d5', INK='#16130f', COAL='#0c0c0d', NAVY='#161c28', HAIR='#2b3547', TEXT='#eef2f8', DIM='#8b96a8', VERM='#e4471d', YEL='#ffce4a', TEAL='#29d9bb';
const RG='#1f7f70', RY='#f6c544';   /* the second Riso ink pair */
const MONO=s=>'bold '+s+'px "Courier Prime","Courier New",monospace';
const SANS=s=>'800 '+s+'px "Helvetica Neue",Helvetica,Arial,"Segoe UI",system-ui,sans-serif';
/* a text layer's own Bold: the app draws (layer.bold ? '700 ' : '') + size + family, so the type tiles use exactly that weight */
const BOLD=s=>'700 '+s+'px "Helvetica Neue",Helvetica,Arial,sans-serif';
const mod=(t,P)=>((t%P)+P)%P;
const reset=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; };
const canvasN=(w,h)=>{ const C=document.createElement('canvas'); C.width=w; C.height=h===undefined?w:h; return [C,C.getContext('2d')]; };
const settle=p=>p<=0?0:p>=1?1:1-Math.pow(2,-8.5*p)*Math.cos(p*9.5);
const tab=(c,x,y,txt,s,bg,fg)=>{ c.font=MONO(s); const w=c.measureText(txt).width; c.fillStyle=bg; c.fillRect(x,y,w+s*.9,s*1.5); c.fillStyle=fg; c.textBaseline='middle'; c.textAlign='left'; c.fillText(txt,x+s*.45,y+s*.8); return w+s*.9; };
const diamond=(c,x,y,r,fill)=>{ c.fillStyle=fill; c.beginPath(); c.moveTo(x,y-r); c.lineTo(x+r,y); c.lineTo(x,y+r); c.lineTo(x-r,y); c.closePath(); c.fill(); };
/* a texture canvas drawn in 0..100 units */
const texOf=n=>{ const [C,x]=canvasN(n); x.setTransform(n/100,0,0,n/100,0,0); return [C,x]; };
const texSize=px=>clamp(Math.round(px*.8),128,480);

/* ---- the app's mesh builders, line for line (js/compositor.js bParam, bPrism, bTube, circlePts, starPts, bOcta) ---- */
function bParam(fn,nu,nv){ const V=[],T=[];
  for(let j=0;j<=nv;j++) for(let i=0;i<=nu;i++){ const u=i/nu, v=j/nv, p=fn(u,v); V.push([p[0],p[1],p[2],u,v]); }
  for(let j=0;j<nv;j++) for(let i=0;i<nu;i++){ const k=j*(nu+1)+i; T.push([k,k+1,k+nu+2],[k,k+nu+2,k+nu+1]); }
  return {v:V,t:T}; }
function bPrism(pts,depth){ const V=[],T=[],n=pts.length,hz=depth/2; let cx=0,cy=0;
  for(let i=0;i<n;i++){ cx+=pts[i][0]; cy+=pts[i][1]; } cx/=n; cy/=n;
  const cu=(cx+1)/2, cv=(cy+1)/2, uu=p=>(p[0]+1)/2, vv=p=>(p[1]+1)/2;
  const f0=V.length; V.push([cx,cy,hz,cu,cv]); for(let i=0;i<n;i++) V.push([pts[i][0],pts[i][1],hz,uu(pts[i]),vv(pts[i])]);
  for(let i=0;i<n;i++) T.push([f0,f0+1+i,f0+1+(i+1)%n]);
  const b0=V.length; V.push([cx,cy,-hz,cu,cv]); for(let i=0;i<n;i++) V.push([pts[i][0],pts[i][1],-hz,uu(pts[i]),vv(pts[i])]);
  for(let i=0;i<n;i++) T.push([b0,b0+1+(i+1)%n,b0+1+i]);
  for(let i=0;i<n;i++){ const p=pts[i], q=pts[(i+1)%n], s=V.length, pu=uu(p), pv=vv(p), qu=uu(q), qv=vv(q);
    const pu2=pu+(cu-pu)*.3, pv2=pv+(cv-pv)*.3, qu2=qu+(cu-qu)*.3, qv2=qv+(cv-qv)*.3;
    V.push([p[0],p[1],hz,pu,pv],[q[0],q[1],hz,qu,qv],[q[0],q[1],-hz,qu2,qv2],[p[0],p[1],-hz,pu2,pv2]); T.push([s,s+1,s+2],[s,s+2,s+3]); }
  return {v:V,t:T}; }
function bTube(outer,inner,depth){ const V=[],T=[],n=outer.length,hz=depth/2, uu=p=>(p[0]+1)/2, vv=p=>(p[1]+1)/2;
  const sides=(pts,flip)=>{ for(let i=0;i<n;i++){ const p=pts[i], q=pts[(i+1)%n], s=V.length, pu=uu(p), pv=vv(p), qu=uu(q), qv=vv(q);
    V.push([p[0],p[1],hz,pu,pv],[q[0],q[1],hz,qu,qv],[q[0],q[1],-hz,qu*.94+.03,qv*.94+.03],[p[0],p[1],-hz,pu*.94+.03,pv*.94+.03]);
    if(flip) T.push([s,s+2,s+1],[s,s+3,s+2]); else T.push([s,s+1,s+2],[s,s+2,s+3]); } };
  sides(outer,false); sides(inner,true);
  for(let i=0;i<n;i++){ const o1=outer[i], o2=outer[(i+1)%n], i1=inner[i], i2=inner[(i+1)%n]; let s=V.length;
    V.push([o1[0],o1[1],hz,uu(o1),vv(o1)],[o2[0],o2[1],hz,uu(o2),vv(o2)],[i2[0],i2[1],hz,uu(i2),vv(i2)],[i1[0],i1[1],hz,uu(i1),vv(i1)]); T.push([s,s+1,s+2],[s,s+2,s+3]);
    s=V.length;
    V.push([o1[0],o1[1],-hz,uu(o1),vv(o1)],[o2[0],o2[1],-hz,uu(o2),vv(o2)],[i2[0],i2[1],-hz,uu(i2),vv(i2)],[i1[0],i1[1],-hz,uu(i1),vv(i1)]); T.push([s,s+2,s+1],[s,s+3,s+2]); }
  return {v:V,t:T}; }
const circlePts=(r,n)=>{ const p=[]; for(let i=0;i<n;i++){ const a=-Math.PI/2+i*TAU/n; p.push([r*Math.cos(a),r*Math.sin(a)]); } return p; };
const starPts=(points,inr)=>{ const p=[]; for(let i=0;i<points*2;i++){ const a=-Math.PI/2+i*Math.PI/points, rr=(i%2===0)?1:inr; p.push([rr*Math.cos(a),rr*Math.sin(a)]); } return p; };
function bOcta(spike,tip){
  const base=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]], faces=[[0,2,4],[2,1,4],[1,3,4],[3,0,4],[2,0,5],[1,2,5],[3,1,5],[0,3,5]];
  const V=[],T=[], uv=p=>[(p[0]+1)/2,(p[1]+1)/2];
  const TIP=tip>0?tip:1.25, rt=spike?(1+spike)/Math.sqrt(3):1, sc=rt>TIP?TIP/rt:1;
  for(let fi=0;fi<faces.length;fi++){ const f=faces[fi], A=base[f[0]], B=base[f[1]], C=base[f[2]], s=V.length;
    V.push([A[0],A[1],A[2],uv(A)[0],uv(A)[1]],[B[0],B[1],B[2],uv(B)[0],uv(B)[1]],[C[0],C[1],C[2],uv(C)[0],uv(C)[1]]);
    if(!spike){ T.push([s,s+1,s+2]); continue; }
    const k=(1+spike)/3, gx=(A[0]+B[0]+C[0])*k, gy=(A[1]+B[1]+C[1])*k, gz=(A[2]+B[2]+C[2])*k;
    if(sc!==1) for(let q=s;q<s+3;q++){ V[q][0]*=sc; V[q][1]*=sc; V[q][2]*=sc; }
    V.push([gx*sc,gy*sc,gz*sc,(uv(A)[0]+uv(B)[0]+uv(C)[0])/3,(uv(A)[1]+uv(B)[1]+uv(C)[1])/3]);
    T.push([s,s+1,s+3],[s+1,s+2,s+3],[s+2,s,s+3]); }
  return {v:V,t:T}; }

/* ---- renderMesh, ported. The face is the texture under the triangle's own affine map (a pattern fill instead of clip+drawImage),
   then black at 1 - shade over the same path: on an opaque texture that is exactly the app's brightness(shade). ---- */
const LX=.42, LY=-.55, LZ=.72;
const DARK=[]; for(let i=0;i<=100;i++) DARK.push('rgba(0,0,0,'+(i/100).toFixed(2)+')');
const PATS=new WeakMap();
function patternOf(c,cv){ let m=PATS.get(c); if(!m){ m=new Map(); PATS.set(c,m); } let p=m.get(cv); if(!p){ p=c.createPattern(cv,'no-repeat'); m.set(cv,p); } return p; }
const deg=d=>d*Math.PI/180;
function solid(c,px,tex,mesh,o){
  const V=mesh.v, T=mesh.t, n=V.length, m=T.length;
  let B=mesh.buf; if(!B) B=mesh.buf={X:new Float64Array(n),Y:new Float64Array(n),Z:new Float64Array(n),PX:new Float64Array(n),PY:new Float64Array(n),zs:new Float64Array(m),ord:new Array(m)};
  const cX=Math.cos(o.rx),sX=Math.sin(o.rx),cY=Math.cos(o.ry),sY=Math.sin(o.ry),cZ=Math.cos(o.rz||0),sZ=Math.sin(o.rz||0),F=o.F||3.2;
  for(let i=0;i<n;i++){ const v=V[i]; let x=v[0],y=v[1],z=v[2],w;
    w=y*cX-z*sX; z=y*sX+z*cX; y=w;
    w=x*cY+z*sY; z=-x*sY+z*cY; x=w;
    w=x*cZ-y*sZ; y=x*sZ+y*cZ; x=w;
    B.X[i]=x; B.Y[i]=y; B.Z[i]=z; const f=F/Math.max(.2,F-z); B.PX[i]=o.cx+x*f*o.R; B.PY[i]=o.cy+y*f*o.R; }
  for(let k=0;k<m;k++){ const q=T[k]; B.zs[k]=B.Z[q[0]]+B.Z[q[1]]+B.Z[q[2]]; B.ord[k]=k; }
  const zs=B.zs; B.ord.sort((a,b)=>zs[a]-zs[b]);
  const pat=patternOf(c,tex), tw=tex.width, th=tex.height, inf=.4*100/px, sh=o.shading, PX=B.PX, PY=B.PY;
  /* o.cull (closed, consistently wound meshes only): a triangle wound against the nearest one faces away and is always hidden
     behind the near side, so it is skipped. Saves half the fills on the torus; the picture is the same. */
  let front=0;
  if(o.cull){ const q=T[B.ord[m-1]]; front=Math.sign((PX[q[1]]-PX[q[0]])*(PY[q[2]]-PY[q[0]])-(PY[q[1]]-PY[q[0]])*(PX[q[2]]-PX[q[0]])); }
  for(let k=0;k<m;k++){
    const q=T[B.ord[k]], i0=q[0], i1=q[1], i2=q[2];
    const ax=PX[i0], ay=PY[i0], bx=PX[i1], by=PY[i1], qx=PX[i2], qy=PY[i2], gx=(ax+bx+qx)/3, gy=(ay+by+qy)/3;
    if(front&&Math.sign((bx-ax)*(qy-ay)-(by-ay)*(qx-ax))===-front) continue;
    let dx=ax-gx, dy=ay-gy, l=Math.hypot(dx,dy)||1; const x0=ax+dx/l*inf, y0=ay+dy/l*inf;
    dx=bx-gx; dy=by-gy; l=Math.hypot(dx,dy)||1; const x1=bx+dx/l*inf, y1=by+dy/l*inf;
    dx=qx-gx; dy=qy-gy; l=Math.hypot(dx,dy)||1; const x2=qx+dx/l*inf, y2=qy+dy/l*inf;
    const va=V[i0], vb=V[i1], vc=V[i2], u0=va[3]*tw, v0=va[4]*th, u1=vb[3]*tw, v1=vb[4]*th, u2=vc[3]*tw, v2=vc[4]*th;
    const den=u0*(v1-v2)+u1*(v2-v0)+u2*(v0-v1); if(Math.abs(den)<1e-6) continue;
    const ma=(x0*(v1-v2)+x1*(v2-v0)+x2*(v0-v1))/den, mb=(y0*(v1-v2)+y1*(v2-v0)+y2*(v0-v1))/den;
    const mc=(x0*(u2-u1)+x1*(u0-u2)+x2*(u1-u0))/den, md=(y0*(u2-u1)+y1*(u0-u2)+y2*(u1-u0))/den;
    const me=x0-ma*u0-mc*v0, mf=y0-mb*u0-md*v0;
    const e1x=B.X[i1]-B.X[i0], e1y=B.Y[i1]-B.Y[i0], e1z=B.Z[i1]-B.Z[i0], e2x=B.X[i2]-B.X[i0], e2y=B.Y[i2]-B.Y[i0], e2z=B.Z[i2]-B.Z[i0];
    const nx=e1y*e2z-e1z*e2y, ny=e1z*e2x-e1x*e2z, nz=e1x*e2y-e1y*e2x, nl=Math.hypot(nx,ny,nz)||1;
    const lam=Math.abs((nx*LX+ny*LY+nz*LZ)/nl), shade=(1-sh)+sh*(.25+.75*lam);
    c.beginPath(); c.moveTo(x0,y0); c.lineTo(x1,y1); c.lineTo(x2,y2); c.closePath();
    pat.setTransform(new DOMMatrix([ma,mb,mc,md,me,mf])); c.fillStyle=pat; c.fill();
    if(shade<.995){ c.fillStyle=DARK[Math.round((1-shade)*100)]; c.fill(); }
  }
}

window.FX_TILES.push(

/* DEPTH PUSH. Cut paper on Bone. rasterextrude itself: copies of the layer filled source-atop with black at Side shade .55, drawn
   one plate pixel apart along Angle 225 (up and left), the layer on top; Taper scales copy i by 1 - taper*i/steps about the
   frame's centre (extrudeTaper966 with no box). Depth 70 px of a 1080 frame (the default is 40, the cap 100), Taper 40%. Moves on
   threes. The layer is a scissor-cut gear with a keyed bore (checker k4: it was an arrow, the set's third after Stripes and Brick
   Slide); the bore is a real hole in the layer, so its inside wall is the copies showing through it. */
{ id:'rasterextrude', name:'Depth Push', section:'3D', isNew:true, still:2.0,
  line:'Darkened copies of the layer stack up behind it, so a flat cut-out gets a solid side; Taper narrows it into the distance.',
  make(px){
    const P=4.6, DEPTH=70*100/1080, ANG=deg(225), DK=.55, TAPER=.4, dx=Math.cos(ANG), dy=Math.sin(ANG);
    /* the layer: one scissor-cut gear in vermilion, nine teeth, an Ink hub ring and a keyed bore; no edge quite true */
    const GX=56, GY=56, N=9, RO=33.5, RR=26.6, RH=14.2, RB=8.6, gr=rng(2381), GEAR=[];
    for(let i=0;i<N;i++){ const p=TAU/N, a=-Math.PI/2+i*p+.06, j=()=> (gr()-.5)*.7;
      [[0,RR],[.2,RR],[.3,RO],[.6,RO],[.7,RR]].forEach(([f,r])=>{ const rr=r+j(), aa=a+f*p; GEAR.push([GX+Math.cos(aa)*rr,GY+Math.sin(aa)*rr]); }); }
    const poly=(x,p)=>{ x.beginPath(); p.forEach((q,i)=>i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1])); x.closePath(); };
    const [L,lx]=canvasN(px); lx.setTransform(px/100,0,0,px/100,0,0);
    lx.fillStyle=VERM; poly(lx,GEAR); lx.fill();
    lx.fillStyle=INK; lx.beginPath(); lx.arc(GX,GY,RH,0,TAU); lx.fill();
    /* the bore and its keyway, cut right through the layer */
    lx.globalCompositeOperation='destination-out'; lx.beginPath(); lx.arc(GX,GY,RB,0,TAU); lx.fill(); lx.fillRect(GX-2.1,GY-RB-3.2,4.2,5); lx.globalCompositeOperation='source-over';
    const [S,sx]=canvasN(px); sx.drawImage(L,0,0); sx.globalCompositeOperation='source-atop'; sx.fillStyle='rgba(0,0,0,'+DK+')'; sx.fillRect(0,0,px,px);
    /* the layer's alpha box in device pixels, only to keep the copies cheap; Taper scales about the frame's centre, because
       rasterextrude is on CFX_NO_BBOX and extrudeTaper966 falls back to W/2, H/2 (measured against the real render) */
    const k=px/100, xs=GEAR.map(q=>q[0]), ys=GEAR.map(q=>q[1]);
    const bx0=Math.max(0,Math.floor(Math.min(...xs)*k)-2), by0=Math.max(0,Math.floor(Math.min(...ys)*k)-2), bx1=Math.min(px,Math.ceil(Math.max(...xs)*k)+2), by1=Math.min(px,Math.ceil(Math.max(...ys)*k)+2), bw=bx1-bx0, bh=by1-by0, ccx=px/2, ccy=px/2;
    const STEP=Math.max(1,Math.round(px/300));
    return (c,t)=>{
      const u=Math.floor(mod(t,P)*8)/8;
      const d = u<.5?0 : u<1.4? DEPTH*settle(seg(u,.5,1.4)) : u<3.75? DEPTH : DEPTH*(1-E.inOut(seg(u,3.75,4.25)));
      const tp = u<2.25?0 : u<3.75? TAPER*E.out(seg(u,2.25,2.75)) : TAPER*(1-E.inOut(seg(u,3.75,4.25)));
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.fillStyle=BONE; c.fillRect(0,0,px,px);
      const steps=Math.round(d*k);
      for(let i=steps;i>=1;i-=STEP){
        const s=1-tp*i/Math.max(1,steps);
        if(tp>0){ c.setTransform(s,0,0,s,ccx+dx*i-ccx*s,ccy+dy*i-ccy*s); }
        else c.setTransform(1,0,0,1,dx*i,dy*i);
        c.drawImage(S,bx0,by0,bw,bh,bx0,by0,bw,bh);
      }
      c.setTransform(1,0,0,1,0,0); c.drawImage(L,bx0,by0,bw,bh,bx0,by0,bw,bh);
      reset(c,px);
    };
  } },

/* RING. Comp sheet on Bone. ring3d: bTube of two 24-sided circles, Hole 62, Depth 35, Size 85, Shading .6, Rotate Y 8 (the
   default), with Rotate X keyed 0 -> 60. The layer is an Ink card printed with a bezel; the planar map keeps the annulus,
   so the card's corners and its centre mark are simply gone. */
{ id:'ring3d', name:'Ring', section:'3D', isNew:true, still:2.4,
  line:'The layer is cut into a thick ring, a washer of its own picture, that you can tip and turn in 3D.',
  make(px){
    const P=4.8, TS=texSize(px), CARD=78, CX=50, CY=46, R=CARD/2*.85;
    const [TX,x]=texOf(TS);
    x.fillStyle=BONE; x.fillRect(0,0,100,100);
    x.save(); x.translate(50,50);
    for(let i=0;i<36;i++){ const a=-Math.PI/2+i*TAU/36, major=i%3===0; x.save(); x.rotate(a); x.fillStyle=INK; if(major) x.fillRect(33.5,-1.5,14,3); else x.fillRect(40,-.85,7.5,1.7); x.restore(); }
    x.fillStyle=VERM; x.beginPath(); x.moveTo(-4.2,-48.8); x.lineTo(4.2,-48.8); x.lineTo(0,-40.2); x.closePath(); x.fill();
    /* the centre of the card: a registration mark, which the hole takes away */
    x.strokeStyle=INK; x.lineWidth=1.1; x.beginPath(); x.arc(0,0,9,0,TAU); x.moveTo(-17,0); x.lineTo(17,0); x.moveTo(0,-17); x.lineTo(0,17); x.stroke();
    x.restore();
    const mesh=bTube(circlePts(1,24),circlePts(.62,24),.35);
    return (c,t)=>{
      const u=Math.floor(mod(t,P)*15)/15; reset(c,px);
      c.fillStyle=COAL; c.fillRect(0,0,100,100);
      const on=u>=.55&&u<4.3;
      const rx = !on?0 : u<.85?0 : u<3.4? 60*settle(seg(u,.85,1.75)) : 60*(1-E.inOut(seg(u,3.4,4.05)));
      if(!on){ c.drawImage(TX,CX-CARD/2,CY-CARD/2,CARD,CARD); }
      else solid(c,px,TX,mesh,{cx:CX,cy:CY,R,rx:deg(rx),ry:deg(8),rz:0,shading:.6});
      tab(c,4,90,'ROT X '+String(Math.round(on?rx:0)).padStart(2,'0')+'°',4.6,BONE,INK);
    };
  } },

/* SPIKED STAR. Pen plotter sheet on Coal. starpoly3d: bOcta with Spike Length keyed .2 -> 2.4 (past 1.2 the star shrinks so its tips
   stay at 1.25, the app's TIP), Size 70, Rotate X 20, Y 30, Shading .65. The layer is a plotted figure: one 3 : 4 Lissajous curve,
   its first half in ink and its second (the mirror of the first) in the red pen, a dot where each pen went down (checker k4: it was
   a target of concentric rings, too close to Hex Column's concentric hexagons). The planar wrap is the app's: the curve rides the facets. */
{ id:'starpoly3d', name:'Spiked Star', section:'3D', isNew:true, still:2.6,
  line:'The layer is wrapped onto an eight-pointed star; Spike Length pulls the points out from a plain gem to a sharp burst.',
  make(px){
    const P=4.8, TS=texSize(px), R=50*.7;
    const [TX,x]=texOf(TS);
    x.fillStyle=BONE; x.fillRect(0,0,100,100);
    const X=s=>50+42*Math.sin(3*s+Math.PI/2), Y=s=>50+41*Math.sin(4*s);
    const half=(col,s0)=>{ x.strokeStyle=col; x.lineWidth=2.8; x.lineJoin='round'; x.lineCap='round'; x.beginPath();
      for(let i=0;i<=480;i++){ const s=s0+i/480*Math.PI; i?x.lineTo(X(s),Y(s)):x.moveTo(X(s),Y(s)); } x.stroke();
      x.fillStyle=col; x.beginPath(); x.arc(X(s0),Y(s0),3.1,0,TAU); x.fill(); };
    half(INK,0); half(VERM,Math.PI);
    const cache=new Map(), meshOf=s=>{ const key=s.toFixed(3); let m=cache.get(key); if(!m){ m=bOcta(s,1.25); cache.set(key,m); } return m; };
    return (c,t)=>{
      const u=Math.floor(mod(t,P)*12)/12; reset(c,px);
      c.fillStyle=COAL; c.fillRect(0,0,100,100);
      const on=u>=.55&&u<4.35;
      const sp = u<1.0? .2 : u<3.55? lerp(.2,2.4,E.inOut(seg(u,1.0,2.0))) : lerp(2.4,.2,E.inOut(seg(u,3.55,4.15)));
      if(!on) c.drawImage(TX,0,0,100,100);
      else solid(c,px,TX,meshOf(Math.round(sp*20)/20),{cx:50,cy:50,R,rx:deg(20),ry:deg(30),rz:0,shading:.65});
      if(on){ c.font=MONO(5.2); c.textAlign='left'; c.textBaseline='alphabetic'; c.fillStyle=TEXT; c.fillText('SPIKE '+(Math.round(sp*20)/20).toFixed(2),4,95.5);
        c.textAlign='right'; c.fillStyle=DIM; c.fillText('FIG. 4',96,95.5); }
    };
  } },

/* STAR COLUMN. Two-ink print (green disc on paper) over a yellow field. starprism3d: bPrism(starPts(Points, .45), Depth 40), Size 85, Rotate X 25, Y 30,
   Shading .6. Points cuts 5 -> 6 -> 8 and back; the sides sample a band from each edge 30% toward the centre, as the app's do. */
{ id:'starprism3d', name:'Star Column', section:'3D', isNew:true, still:1.2,
  line:'The layer becomes a thick star-shaped slab with its picture on the face; Points sets how many arms it has.',
  make(px){
    const P=4.8, TS=texSize(px), R=50*.85;
    const [TX,x]=texOf(TS), r=rng(2319);
    x.fillStyle=BONE; x.fillRect(0,0,100,100);
    /* green plate: one big disc, off centre, on the paper; the yellow is the field the sheet lies on */
    x.fillStyle=RG; x.beginPath(); x.arc(62,63,27,0,TAU); x.fill();
    x.fillStyle=RY; x.fillRect(6.7,8.7,30,5.4);   /* a yellow rule, 0.7 out of register with the green */
    /* paper speckle where the drum missed */
    for(let i=0;i<260;i++){ x.fillStyle=i%5?'rgba(231,226,213,.55)':'rgba(31,127,112,.35)'; const a=r()*100, b=r()*100, s=.25+r()*.55; x.fillRect(a,b,s,s); }
    const meshes={}; [5,6,8].forEach(n=>meshes[n]=bPrism(starPts(n,.45),.4));
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      c.fillStyle=RY; c.fillRect(0,0,100,100);
      const on=u>=.5&&u<4.35, pts = u<1.9?5 : u<2.75?6 : u<3.6?8 : 5;
      if(!on) c.drawImage(TX,0,0,100,100);
      else solid(c,px,TX,meshes[pts],{cx:50,cy:50,R,rx:deg(25),ry:deg(30),rz:0,shading:.6});
      if(on){ c.font=SANS(6.4); c.textAlign='left'; c.textBaseline='alphabetic'; c.fillStyle=RG; c.fillText(pts+' POINTS',4,96); }
    };
  } },

/* TORUS. Contact sheet. torus3d: bParam 26 x 12 round the ring and the tube, Rotate X 55, Y 10, Shading .6, with Thickness keyed
   30 -> 45 -> 14, stepped at 12 fps. The layer is a darkroom contact sheet of two strips: u runs round the ring and v round the
   tube, and the tube's visible face is the top half of the sheet (v 0 to .5), so the upper strip lies round the ring as a loop. */
{ id:'torus3d', name:'Torus', section:'3D', isNew:true, still:1.0,
  line:'The layer wraps round a doughnut: across the picture goes round the ring, down goes round the tube; Thickness fattens it.',
  make(px){
    const P=4.6, TS=texSize(px), R=50*.85, PAPER='#d9d4c6', CHINA='#d8321f';
    const [TX,x]=texOf(TS), gr=rng(2323);
    x.fillStyle=COAL; x.fillRect(0,0,100,100);
    for(let s=0;s<2;s++){ const y0=s*50;
      x.fillStyle=PAPER;
      for(let i=0;i<20;i++){ const hx=1.4+i*5; x.fillRect(hx,y0+2.3,2.3,3.3); x.fillRect(hx,y0+44.4,2.3,3.3); }
      for(let i=0;i<6;i++){ const fx=i*100/6+1.3, fw=100/6-2.6, fy=y0+8.6, fh=33, n=s*6+i;
        /* an exposure test strip: each frame one stop darker than the last */
        const g=Math.round(lerp(238,92,i/5)); x.fillStyle='rgb('+g+','+Math.round(g*.975)+','+Math.round(g*.93)+')'; x.fillRect(fx,fy,fw,fh);
        x.font=MONO(2.5); x.fillStyle=PAPER; x.textBaseline='middle'; x.textAlign='left'; x.fillText((2<<i)+'S',fx+.6,y0+(s?1.1:7.3)); }
      for(let i=0;i<500;i++){ x.fillStyle='rgba(12,12,13,'+(.08+gr()*.14).toFixed(2)+')'; x.fillRect(gr()*100,y0+8.6+gr()*33,.3,.3); }
    }
    /* the pick, ringed in chinagraph */
    x.strokeStyle=CHINA; x.lineWidth=1.3; x.beginPath(); for(let i=0;i<=26;i++){ const a=i/24*TAU, r=1+.05*Math.sin(i*1.7); const cx=100/6*2.5, cy=25; const X=cx+Math.cos(a)*9.8*r, Y=cy+Math.sin(a)*18.5*r; i?x.lineTo(X,Y):x.moveTo(X,Y); } x.stroke();
    const cache=new Map(), meshOf=thk=>{ const key=thk.toFixed(3); let m=cache.get(key); if(!m){ m=bParam((u,v)=>{ const lon=(u-.5)*TAU, tube=v*TAU, R0=1-thk; return [(R0+thk*Math.cos(tube))*Math.sin(lon),thk*Math.sin(tube),(R0+thk*Math.cos(tube))*Math.cos(lon)]; },26,12); cache.set(key,m); } return m; };
    return (c,t)=>{
      const u=mod(t,P), f=Math.floor(u*12)/12; reset(c,px);
      c.fillStyle=PAPER; c.fillRect(0,0,100,100);
      const on=f>=.6&&f<4.1;
      const th = f<1.2?30 : f<1.6? lerp(30,45,E.inOut(seg(f,1.2,1.6))) : f<2.5?45 : f<2.9? lerp(45,14,E.inOut(seg(f,2.5,2.9))) : f<3.6?14 : lerp(14,30,E.inOut(seg(f,3.6,4.0)));
      const thk=Math.round(th)/100;
      if(!on) c.drawImage(TX,0,0,100,100);
      else solid(c,px,TX,meshOf(thk),{cx:50,cy:50,R,rx:deg(55),ry:deg(10),rz:0,shading:.6,cull:true});
      if(on){ c.font=MONO(5); c.textAlign='left'; c.textBaseline='alphabetic'; c.fillStyle=COAL; c.fillText('THICK '+Math.round(th)+'%',3.5,96.5); }
    };
  } },

/* ODOMETER ROLL. Viewer overlay. odometerState and drawOdometerLines: From 996 To 1000, Minimum digits 4, Progress keyed in
   quarter steps. Each turning wheel is clipped to its own character box one font size tall; a wheel turns only while every
   wheel below it passes 9 -> 0, so 0999 -> 1000 turns all four together. The slider is Progress and its five keyframes. */
{ id:'odometer', name:'Odometer Roll', section:'Text', isNew:true, still:1.12,
  line:'Each digit rolls up to the next like a mechanical counter, and a carry turns every wheel together: 0999 to 1000.',
  make(px){
    const P=4.6, FS=31, YY=47, X0=5, FROM=996, TO=1000;
    const K=[[0,0],[.35,0],[.7,1],[.95,1],[1.3,2],[1.55,2],[1.9,3],[2.15,3],[2.8,4],[3.75,4],[4.3,0],[4.6,0]];
    const at=u=>{ for(let i=1;i<K.length;i++){ if(u<=K[i][0]){ const a=K[i-1], b=K[i]; return lerp(a[1],b[1],E.inOut(seg(u,a[0],b[0]))); } } return 0; };
    const wheelsAt=prog=>{ let pos=Math.abs(FROM+(TO-FROM)*prog); const whole=Math.round(pos); if(Math.abs(pos-whole)<1e-3) pos=whole;
      const out=[]; for(let j=0;j<4;j++){ const k=3-j, Pk=Math.pow(10,k), q=Math.floor(pos/Pk), digit=q%10, r=pos-q*Pk, turn=r>Pk-1?Math.min(1,r-(Pk-1)):0; out.push({digit,next:(digit+1)%10,roll:turn}); } return out; };
    const TX=91, T0=84, T1=14, yOf=p=>lerp(T0,T1,p);
    return (c,t)=>{
      const u=mod(t,P), pr=at(u)/4, W=wheelsAt(pr); reset(c,px);
      c.fillStyle=NAVY; c.fillRect(0,0,100,100);
      c.font=BOLD(FS); c.textBaseline='middle'; c.textAlign='left'; c.fillStyle=TEXT;
      const s=W.map(w=>String(w.digit)).join('');
      for(let i=0;i<4;i++){ const w=W[i], a=X0+(i?c.measureText(s.slice(0,i)).width:0), b=X0+c.measureText(s.slice(0,i+1)).width;
        if(!(w.roll>0)){ c.fillText(String(w.digit),a,YY); continue; }
        c.save(); c.beginPath(); c.rect(a,YY-FS/2,b-a,FS); c.clip();
        c.fillText(String(w.digit),a,YY-w.roll*FS); c.fillText(String(w.next),a,YY+(1-w.roll)*FS); c.restore(); }
      /* Progress, upright: the track, its keyframes, the handle */
      c.strokeStyle=DIM; c.lineWidth=.5; c.beginPath(); c.moveTo(TX,T0); c.lineTo(TX,T1); c.stroke();
      for(let i=0;i<=4;i++) diamond(c,TX,yOf(i/4),2.1,YEL);
      const hy=yOf(pr); c.fillStyle=TEAL; c.fillRect(TX-1.7,hy-1.7,3.4,3.4);
      c.font=MONO(4.8); c.fillStyle=DIM; c.textAlign='left'; c.textBaseline='alphabetic'; c.fillText('PROGRESS',X0,93);
      c.fillStyle=TEXT; c.fillText(pr.toFixed(2),X0+27,93);
    };
  } },

/* TEXT CURVE. Type poster, Ink on Bone. drawArcLine: R = text width / |Curve|, glyph k centred at angle ((s + w/2)/tw - .5) * Curve,
   placed at (R sin a, R - R cos a) and turned by a, Follow the curve. Curve 0 -> 150. The word is too wide for the frame straight. */
{ id:'textcurve', name:'Text Curve', section:'Text', isNew:true, still:2.2,
  line:'The line of text bends round an arc: the same letters and spacing, each one turned to follow the curve.',
  make(px){
    const P=4.4, WORD='HORIZON', FS=22.5, AX=50, AY=36;
    const m=canvasN(8)[1]; m.font=BOLD(FS); const ch=WORD.split(''), wd=ch.map(q=>m.measureText(q).width), tw=wd.reduce((a,b)=>a+b,0);
    return (c,t)=>{
      const u=Math.floor(mod(t,P)*12)/12; reset(c,px);
      c.fillStyle=BONE; c.fillRect(0,0,100,100);
      const cv = u<.6?0 : u<3.2? 150*E.inOut(seg(u,.6,1.5)) : 150*(1-E.inOut(seg(u,3.2,3.9)));
      c.font=BOLD(FS); c.fillStyle=INK; c.textAlign='center'; c.textBaseline='middle';
      if(Math.abs(cv)<=.5){ c.fillText(WORD,AX,AY); return; }
      const ac=deg(cv), aa=Math.abs(ac), Rr=tw/aa, sg=cv>=0?1:-1; let s=0;
      for(let k=0;k<ch.length;k++){ const a=((s+wd[k]/2)/tw-.5)*aa; c.save(); c.translate(AX+Rr*Math.sin(a),AY+sg*(Rr-Rr*Math.cos(a))); c.rotate(sg*a); c.fillText(ch[k],0,0); c.restore(); s+=wd[k]; }
    };
  } }

);
})();
