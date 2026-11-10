/* FreeMotion effect pictures, artist 22 (c22): seven of the 3D solids. No photographs: every layer here is drawn for its tile.
   Every solid is drawn with the app's own pipeline, mirrored from js/compositor.js: the same mesh builder (bParam, bPrism, bTube,
   bOcta, bPyramid, copied below), renderMesh's rotation order (X, then Y, then Z), its weak perspective F = 3.2, its painter sort
   on summed depth, its 0.4 px seam inflation and its flat double-sided Lambert light (.42, -.55, .72). R is half the layer's
   longer side times Size, as solidFx sets it. renderMesh dims a face with ctx.filter brightness(s); iPhones lack ctx.filter, so
   here the face is drawn and black is laid over it at 1 - s, which is the same thing on an opaque layer. */
(function(){ 'use strict';
const {TAU,clamp,lerp,seg,E,rng,hash,vnoise,canvasOf,photo,photoCover}=window.FXK;

const BONE='#e7e2d5', INK='#16130f', COAL='#0c0c0d', NAVY='#161c28', HAIR='#2b3547', TEXT='#eef2f8', DIM='#8b96a8', VERM='#e4471d', YEL='#ffce4a', TEAL='#29d9bb';
const SILVER='#bfc2c4';
const MONO=s=>'bold '+s+'px "Courier Prime","Courier New",monospace';
const SANS=s=>'800 '+s+'px "Helvetica Neue",Helvetica,Arial,"Segoe UI",system-ui,sans-serif';
const mod=(t,P)=>((t%P)+P)%P;
const reset=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; };
const sheet=(w,h)=>{ const C=document.createElement('canvas'); C.width=w; C.height=h===undefined?w:h; return [C,C.getContext('2d')]; };
/* damped settle: a turn that lands, overshoots a little and stops */
const settle=p=>p<=0?0:p>=1?1:1-Math.pow(2,-8.5*p)*Math.cos(p*9.5);
const DEG=Math.PI/180;

/* ---- the app's mesh builders, as in js/compositor.js ---- */
function bParam(fn,nu,nv){ const V=[],T=[]; for(let j=0;j<=nv;j++) for(let i=0;i<=nu;i++){ const u=i/nu, v=j/nv, p=fn(u,v); V.push([p[0],p[1],p[2],u,v]); }
  for(let j=0;j<nv;j++) for(let i=0;i<nu;i++){ const k=j*(nu+1)+i; T.push([k,k+1,k+nu+2],[k,k+nu+2,k+nu+1]); } return {v:V,t:T}; }
function bPrism(pts,depth){ const V=[],T=[],n=pts.length,hz=depth/2; let cx=0,cy=0; for(let i=0;i<n;i++){ cx+=pts[i][0]; cy+=pts[i][1]; } cx/=n; cy/=n;
  const cu=(cx+1)/2, cv=(cy+1)/2, uu=p=>(p[0]+1)/2, vv=p=>(p[1]+1)/2;
  const f0=V.length; V.push([cx,cy,hz,cu,cv]); for(let i=0;i<n;i++) V.push([pts[i][0],pts[i][1],hz,uu(pts[i]),vv(pts[i])]); for(let i=0;i<n;i++) T.push([f0,f0+1+i,f0+1+(i+1)%n]);
  const b0=V.length; V.push([cx,cy,-hz,cu,cv]); for(let i=0;i<n;i++) V.push([pts[i][0],pts[i][1],-hz,uu(pts[i]),vv(pts[i])]); for(let i=0;i<n;i++) T.push([b0,b0+1+(i+1)%n,b0+1+i]);
  for(let i=0;i<n;i++){ const p=pts[i], q=pts[(i+1)%n], s=V.length, pu=uu(p), pv=vv(p), qu=uu(q), qv=vv(q), pu2=pu+(cu-pu)*.3, pv2=pv+(cv-pv)*.3, qu2=qu+(cu-qu)*.3, qv2=qv+(cv-qv)*.3;
    V.push([p[0],p[1],hz,pu,pv],[q[0],q[1],hz,qu,qv],[q[0],q[1],-hz,qu2,qv2],[p[0],p[1],-hz,pu2,pv2]); T.push([s,s+1,s+2],[s,s+2,s+3]); }
  return {v:V,t:T}; }
function bTube(outer,inner,depth){ const V=[],T=[],n=outer.length,hz=depth/2, uu=p=>(p[0]+1)/2, vv=p=>(p[1]+1)/2;
  const loopSides=(pts,flip)=>{ for(let i=0;i<n;i++){ const p=pts[i], q=pts[(i+1)%n], s=V.length, pu=uu(p), pv=vv(p), qu=uu(q), qv=vv(q);
    V.push([p[0],p[1],hz,pu,pv],[q[0],q[1],hz,qu,qv],[q[0],q[1],-hz,qu*.94+.03,qv*.94+.03],[p[0],p[1],-hz,pu*.94+.03,pv*.94+.03]);
    if(flip) T.push([s,s+2,s+1],[s,s+3,s+2]); else T.push([s,s+1,s+2],[s,s+2,s+3]); } };
  loopSides(outer,false); loopSides(inner,true);
  for(let i=0;i<n;i++){ const o1=outer[i], o2=outer[(i+1)%n], i1=inner[i], i2=inner[(i+1)%n]; let s=V.length;
    V.push([o1[0],o1[1],hz,uu(o1),vv(o1)],[o2[0],o2[1],hz,uu(o2),vv(o2)],[i2[0],i2[1],hz,uu(i2),vv(i2)],[i1[0],i1[1],hz,uu(i1),vv(i1)]); T.push([s,s+1,s+2],[s,s+2,s+3]);
    s=V.length; V.push([o1[0],o1[1],-hz,uu(o1),vv(o1)],[o2[0],o2[1],-hz,uu(o2),vv(o2)],[i2[0],i2[1],-hz,uu(i2),vv(i2)],[i1[0],i1[1],-hz,uu(i1),vv(i1)]); T.push([s,s+2,s+1],[s,s+3,s+2]); }
  return {v:V,t:T}; }
function circlePts(r,n){ const p=[]; for(let i=0;i<n;i++){ const a=-Math.PI/2+i*2*Math.PI/n; p.push([r*Math.cos(a),r*Math.sin(a)]); } return p; }
function heartPts(n){ const p=[]; for(let i=0;i<n;i++){ const a=i*2*Math.PI/n; p.push([Math.pow(Math.sin(a),3)*16/17,-(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a))/17]); } return p; }
function bOcta(){ const base=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]], faces=[[0,2,4],[2,1,4],[1,3,4],[3,0,4],[2,0,5],[1,2,5],[3,1,5],[0,3,5]], V=[], T=[], uv=p=>[(p[0]+1)/2,(p[1]+1)/2];
  for(const f of faces){ const s=V.length; for(const k of f){ const p=base[k], q=uv(p); V.push([p[0],p[1],p[2],q[0],q[1]]); } T.push([s,s+1,s+2]); } return {v:V,t:T}; }
function bPyramid(){ const V=[],T=[], b=[[-1,1,-1],[1,1,-1],[1,1,1],[-1,1,1]], ap=[0,-1,0];
  for(let i=0;i<4;i++){ const A=b[i], B=b[(i+1)%4], s=V.length; V.push([A[0],A[1],A[2],0,1],[B[0],B[1],B[2],1,1],[ap[0],ap[1],ap[2],.5,0]); T.push([s,s+1,s+2]); }
  const s=V.length; for(let i=0;i<4;i++) V.push([b[i][0],b[i][1],b[i][2],(b[i][0]+1)/2,(b[i][2]+1)/2]); T.push([s,s+2,s+1],[s,s+3,s+2]); return {v:V,t:T}; }
function meshMerge(list){ const V=[],T=[]; for(const m of list){ const off=V.length; for(const v of m.v) V.push(v); for(const tr of m.t) T.push([tr[0]+off,tr[1]+off,tr[2]+off]); } return {v:V,t:T}; }

/* ---- renderMesh, mirrored. o: rx, ry, rz in degrees; cx, cy, R in the tile's 0..100 units; shading; F (3.2 = Perspective 50).
   Two savings that leave the picture as it is, both read once from the layer in make():
   - (scan = true, for layers in flat colours) a face whose patch of the layer is one flat colour is filled with that colour at
     its shade, instead of texture-mapped through a clip (the app's brightness(s) of a flat colour is that colour times s);
   - on a CONVEX solid (convex = true) a face turned away is filled flat in its average colour: the near faces paint over it, and
     the hairline gaps between them still show the right colour behind, as in the app. Never on the heart or the open box. */
function meshDrawer(mesh,tex0,convex,scan){
  const V=mesh.v, T=mesh.t, n=V.length, m=T.length;
  const SX=new Float64Array(n), SY=new Float64Array(n), X3=new Float64Array(n), Y3=new Float64Array(n), Z3=new Float64Array(n), zk=new Float64Array(m), ord=[];
  for(let i=0;i<m;i++) ord.push(i);
  const col=new Float32Array(m*3), flat=new Uint8Array(m);
  { const w=tex0.width, h=tex0.height, d=tex0.getContext('2d').getImageData(0,0,w,h).data;
    if(!scan){   /* a layer printed all over (type, pen lines, grain): no face is one colour, so only the turned-away faces' average is read */
      for(let i=0;i<m;i++){ const t=T[i]; let r=0,g=0,b=0; for(const s of [[1/3,1/3,1/3],[.7,.15,.15],[.15,.7,.15],[.15,.15,.7]]){ const u=s[0]*V[t[0]][3]+s[1]*V[t[1]][3]+s[2]*V[t[2]][3], v=s[0]*V[t[0]][4]+s[1]*V[t[1]][4]+s[2]*V[t[2]][4], j=(Math.min(h-1,Math.max(0,v*h|0))*w+Math.min(w-1,Math.max(0,u*w|0)))*4; r+=d[j]; g+=d[j+1]; b+=d[j+2]; }
        col[i*3]=r/4; col[i*3+1]=g/4; col[i*3+2]=b/4; } }
    else for(let i=0;i<m;i++){ const t=T[i], P3=t.map(k=>[V[k][3]*w,V[k][4]*h]);
      let x0=Math.floor(Math.min(P3[0][0],P3[1][0],P3[2][0])-1), x1=Math.ceil(Math.max(P3[0][0],P3[1][0],P3[2][0])+1), y0=Math.floor(Math.min(P3[0][1],P3[1][1],P3[2][1])-1), y1=Math.ceil(Math.max(P3[0][1],P3[1][1],P3[2][1])+1);
      x0=Math.max(0,x0); y0=Math.max(0,y0); x1=Math.min(w-1,x1); y1=Math.min(h-1,y1);
      const ar=(P3[1][0]-P3[0][0])*(P3[2][1]-P3[0][1])-(P3[1][1]-P3[0][1])*(P3[2][0]-P3[0][0]), sg=ar<0?-1:1;
      const E3=[0,1,2].map(e=>{ const a=P3[e], b=P3[(e+1)%3], L=Math.hypot(b[0]-a[0],b[1]-a[1])||1; return [a,b,L]; });
      let cnt=0, r=0, g=0, bl=0, mn=[255,255,255], mx=[0,0,0];
      const st=(x1-x0)*(y1-y0)>30000?2:1;   /* a big patch is read every other texel: every mark on these layers is 3 px or wider */
      for(let y=y0;y<=y1;y+=st) for(let x=x0;x<=x1;x+=st){ const X=x+.5, Y=y+.5; let ok=true;
        for(const [a,b,L] of E3){ if(sg*((b[0]-a[0])*(Y-a[1])-(b[1]-a[1])*(X-a[0]))/L < -1.2){ ok=false; break; } }
        if(!ok) continue; const j=(y*w+x)*4; cnt++; r+=d[j]; g+=d[j+1]; bl+=d[j+2];
        for(let q=0;q<3;q++){ const vq=d[j+q]; if(vq<mn[q]) mn[q]=vq; if(vq>mx[q]) mx[q]=vq; } }
      if(!cnt){ const u=(P3[0][0]+P3[1][0]+P3[2][0])/3|0, v=(P3[0][1]+P3[1][1]+P3[2][1])/3|0, j=(Math.min(h-1,Math.max(0,v))*w+Math.min(w-1,Math.max(0,u)))*4; r=d[j]; g=d[j+1]; bl=d[j+2]; cnt=1; mn=[0,0,0]; mx=[255,255,255]; }
      col[i*3]=r/cnt; col[i*3+1]=g/cnt; col[i*3+2]=bl/cnt; flat[i]=(mx[0]-mn[0]<=3&&mx[1]-mn[1]<=3&&mx[2]-mn[2]<=3)?1:0; } }
  return function(c,px,tex,o){
    const cX=Math.cos(o.rx*DEG), sX=Math.sin(o.rx*DEG), cY=Math.cos(o.ry*DEG), sY=Math.sin(o.ry*DEG), cZ=Math.cos(o.rz*DEG), sZ=Math.sin(o.rz*DEG);
    const F=o.F||3.2, ortho=F===Infinity, k=px/100, R=o.R*k, cx=o.cx*k, cy=o.cy*k, tw=tex.width, th=tex.height, SH=o.shading, INF=.4*Math.max(1,px/300);
    for(let i=0;i<n;i++){ const v=V[i]; let x=v[0], y=v[1], z=v[2], w;
      w=y*cX-z*sX; z=y*sX+z*cX; y=w;
      w=x*cY+z*sY; z=-x*sY+z*cY; x=w;
      w=x*cZ-y*sZ; y=x*sZ+y*cZ; x=w;
      X3[i]=x; Y3[i]=y; Z3[i]=z; const f=ortho?1:F/Math.max(.2,F-z); SX[i]=cx+x*f*R; SY[i]=cy+y*f*R; }
    for(let i=0;i<m;i++){ const t=T[i]; zk[i]=Z3[t[0]]+Z3[t[1]]+Z3[t[2]]; }
    ord.sort((a,b)=>zk[a]-zk[b]);
    c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; c.fillStyle='#000';
    for(let q=0;q<m;q++){
      const id=ord[q], tr=T[id], A=tr[0], B=tr[1], C=tr[2];
      const e1x=X3[B]-X3[A], e1y=Y3[B]-Y3[A], e1z=Z3[B]-Z3[A], e2x=X3[C]-X3[A], e2y=Y3[C]-Y3[A], e2z=Z3[C]-Z3[A];
      const nx=e1y*e2z-e1z*e2y, ny=e1z*e2x-e1x*e2z, nz=e1x*e2y-e1y*e2x, nl=Math.hypot(nx,ny,nz)||1;
      const lam=Math.abs((nx*.42+ny*-.55+nz*.72)/nl), shade=(1-SH)+SH*(.25+.75*lam);
      const ax=SX[A], ay=SY[A], bx=SX[B], by=SY[B], qx=SX[C], qy=SY[C], gx=(ax+bx+qx)/3, gy=(ay+by+qy)/3;
      const inf=(x,y)=>{ const dx=x-gx, dy=y-gy, l=Math.hypot(dx,dy)||1; return [x+dx/l*INF,y+dy/l*INF]; };
      const p0=inf(ax,ay), p1=inf(bx,by), p2=inf(qx,qy);
      let plain=flat[id]===1;
      if(!plain&&convex){ const hx=(X3[A]+X3[B]+X3[C])/3, hy=(Y3[A]+Y3[B]+Y3[C])/3, hz=(Z3[A]+Z3[B]+Z3[C])/3, out=(nx*hx+ny*hy+nz*hz)<0?-1:1;
        plain=out*(ortho?nz:(nx*-hx+ny*-hy+nz*(F-hz)))<=0; }
      if(plain){ const j=id*3; c.fillStyle='rgb('+Math.round(col[j]*shade)+','+Math.round(col[j+1]*shade)+','+Math.round(col[j+2]*shade)+')';
        c.beginPath(); c.moveTo(p0[0],p0[1]); c.lineTo(p1[0],p1[1]); c.lineTo(p2[0],p2[1]); c.closePath(); c.fill(); c.fillStyle='#000'; continue; }
      const va=V[A], vb=V[B], vc=V[C], u0=va[3]*tw, v0=va[4]*th, u1=vb[3]*tw, v1=vb[4]*th, u2=vc[3]*tw, v2=vc[4]*th;
      const den=u0*(v1-v2)+u1*(v2-v0)+u2*(v0-v1); if(Math.abs(den)<1e-6) continue;
      const x0=p0[0], y0=p0[1], x1=p1[0], y1=p1[1], x2=p2[0], y2=p2[1];
      const ma=(x0*(v1-v2)+x1*(v2-v0)+x2*(v0-v1))/den, mb=(y0*(v1-v2)+y1*(v2-v0)+y2*(v0-v1))/den;
      const mc=(x0*(u2-u1)+x1*(u0-u2)+x2*(u1-u0))/den, md=(y0*(u2-u1)+y1*(u0-u2)+y2*(u1-u0))/den;
      const me=x0-ma*u0-mc*v0, mf=y0-mb*u0-md*v0;
      c.save(); c.beginPath(); c.moveTo(x0,y0); c.lineTo(x1,y1); c.lineTo(x2,y2); c.closePath(); c.clip();
      c.setTransform(ma,mb,mc,md,me,mf); c.drawImage(tex,0,0);
      if(shade<.999){ c.globalAlpha=1-shade; c.fillRect(0,0,tw,th); }
      c.restore();
    }
    c.setTransform(px/100,0,0,px/100,0,0);
  };
}

/* key path: K = [[t, duration, a, b], ...]; each move runs from the previous key's values, through `ease`, and then holds */
const keyed=(K,u,ease,wrap)=>{ let a=K[0][2], b=K[0][3]; for(let i=1;i<K.length;i++){ if(u<K[i][0]) break; const p=ease(seg(u,K[i][0],K[i][0]+K[i][1])), A=K[i-1], B=K[i];
  const d0=wrap?(((B[2]-A[2]+540)%360)-180):B[2]-A[2], d1=wrap?(((B[3]-A[3]+540)%360)-180):B[3]-A[3]; a=A[2]+d0*p; b=A[3]+d1*p; } return [a,b]; };

window.FX_TILES.push(

/* CYLINDER. Two-ink print: a bill printed in ink and vermilion on bone paper, rolled into a column. Length 200, so this sheet's
   1.95 : 1 shape wraps without stretching; Size 90; Rotate X 0, so Rotate Y turns it on its own axis. Rotate Y is keyed one full
   turn, drawn on twos. The flat sheet first, then the column. */
{ id:'cylinder3d', name:'Cylinder', section:'3D', isNew:true, still:3.3,
  line:'The layer is rolled round a cylinder, so turning it carries the print round the curve.',
  make(px){
    const P=4.4, LEN=2, SIZE=.9, LW=78, LH=40, CX=50, CY=50, R=Math.max(LW,LH)/2*SIZE;
    const TW=780, TH=400, [TX,tx]=sheet(TW,TH), r=rng(22001);
    tx.fillStyle=BONE; tx.fillRect(0,0,TW,TH);
    tx.globalCompositeOperation='multiply'; tx.textBaseline='alphabetic'; tx.textAlign='left'; tx.font=SANS(156);
    tx.fillStyle=INK; tx.fillText('ONE',24,128); tx.fillText('NIGHT',24,254); tx.fillRect(0,0,TW,6);
    tx.fillStyle=VERM; tx.fillText('ONLY',28,381);                          /* the vermilion plate, a hair off register */
    tx.globalCompositeOperation='source-over';
    for(let i=0;i<2400;i++){ tx.fillStyle=r()<.85?'rgba(231,226,213,.6)':'rgba(22,19,15,.25)'; const s=1+r()*2; tx.fillRect(r()*TW,r()*TH,s,s); }
    const draw=meshDrawer((()=>{ const side=bParam((u,v)=>{ const lon=(u-.5)*TAU; return [Math.sin(lon)*.62,(v-.5)*LEN,Math.cos(lon)*.62]; },24,4);
      const cp=circlePts(.62,20), cF={v:[],t:[]}, cB={v:[],t:[]}; cF.v.push([0,-LEN/2,0,.5,.5]); cB.v.push([0,LEN/2,0,.5,.5]);
      for(const q of cp){ cF.v.push([q[0],-LEN/2,q[1],(q[0]/.62+1)/2,(q[1]/.62+1)/2]); cB.v.push([q[0],LEN/2,q[1],(q[0]/.62+1)/2,(q[1]/.62+1)/2]); }
      for(let i=0;i<cp.length;i++){ cF.t.push([0,1+i,1+(i+1)%cp.length]); cB.t.push([0,1+(i+1)%cp.length,1+i]); }
      return meshMerge([side,cF,cB]); })(),TX,true);
    const ryAt=u=>{ const f=Math.floor(u*12)/12; return 360*(1-E.inOut(seg(f,.9,3.5))); };
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      c.fillStyle=VERM; c.fillRect(0,0,100,100);
      if(u<.55||u>=4.05){ c.drawImage(TX,CX-LW/2,CY-LH/2,LW,LH); return; }
      draw(c,px,TX,{rx:0,ry:ryAt(u),rz:0,cx:CX,cy:CY,R,shading:.6});
    };
  } },

/* CAPSULE. A two-colour layer, vermilion left and ink right with a code printed across the join, on the effect's own ellipsoid
   (1.15 x .62 x .62, 22 x 14 facets). Rotate X 25 and Rotate Z 25 are its defaults; Auto-spin X 90 deg/s rolls it on its long
   axis, so the join stays put and the print travels round. */
{ id:'ellipsoid3d', name:'Capsule', section:'3D', isNew:true, still:3.7,
  line:'The layer is wrapped round a stretched sphere, here a two-colour capsule rolling on its long axis.',
  make(px){
    const P=4, LS=74, CX=50, CY=49, R=LS/2*.85, TS=512, [TX,tx]=sheet(TS);
    tx.fillStyle=VERM; tx.fillRect(0,0,TS/2,TS); tx.fillStyle=INK; tx.fillRect(TS/2,0,TS/2,TS);
    tx.textBaseline='middle'; tx.font=SANS(50);
    tx.fillStyle=INK; tx.textAlign='right'; tx.fillText('FM',TS*.5-18,TS*.5); tx.fillStyle=BONE; tx.textAlign='left'; tx.fillText('25',TS*.5+18,TS*.5);
    const draw=meshDrawer(bParam((u,v)=>{ const lon=(u-.5)*TAU, lat=(v-.5)*Math.PI; return [Math.cos(lat)*Math.sin(lon)*1.15,Math.sin(lat)*.62,Math.cos(lat)*Math.cos(lon)*.62]; },22,14),TX,true,true);
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      c.fillStyle=BONE; c.fillRect(0,0,100,100);
      draw(c,px,TX,{rx:25+90*u,ry:0,rz:25,cx:CX,cy:CY,R,shading:.55});
    };
  } },

/* HEART. A typed page: an edit decision list in Courier, one event marked in highlighter, cut to a Heart at its defaults
   (Rotate X 15, Rotate Y 30, Depth 45, Size 85). Rotate Y keyed with linear moves and holds: the front, the far face (the page
   mirrored, as the back shows it) and round again; the sides are the page's edge pixels stretched. Page first, a hard cut. */
{ id:'heart3d', name:'Heart', section:'3D', isNew:true, still:1.0,
  line:'The layer is cut to a heart and given depth, so it turns in space with the picture on both faces.',
  make(px){
    const P=4.4, LS=78, CX=50, CY=50, R=LS/2*.85, TS=512, [TX,tx]=sheet(TS);
    tx.fillStyle=BONE; tx.fillRect(0,0,TS,TS);
    const tcs=(f)=>{ const p2=v=>(v<10?'0':'')+v, s=Math.floor(f/25); return '01:'+p2(Math.floor(s/60)%60)+':'+p2(s%60)+':'+p2(f%25); };
    const LH=25, X0=14; tx.font='bold 17px "Courier Prime","Courier New",monospace'; tx.textBaseline='alphabetic'; tx.textAlign='left';
    let f0=0; const r=rng(22003);
    for(let i=0;i<20;i++){ const y=26+i*LH;
      if(i===0){ tx.fillStyle=INK; tx.fillText('TITLE: FOR YOU      FCM: NON-DROP',X0,y); continue; }
      if(i===1) continue;
      const len=Math.floor(40+r()*130), f1=f0+len, ev=String(i-1).padStart(3,'0');
      if(i===9){ tx.fillStyle=YEL; tx.fillRect(X0-6,y-18,TS-2*X0+12,24); }
      tx.fillStyle=INK; tx.fillText(ev+'  AX  '+(i%4===3?'AA':'V ')+'  C   '+tcs(f0)+' '+tcs(f1),X0,y); f0=f1; }
    const draw=meshDrawer(bPrism(heartPts(28),.45),TX,false);
    const ryAt=u=>{ const f=Math.floor(u*25)/25; return f<1.4?30:f<2.0?lerp(30,210,(f-1.4)/.6):f<2.9?210:f<3.5?lerp(210,390,(f-2.9)/.6):390; };
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      c.fillStyle=INK; c.fillRect(0,0,100,100);
      if(u<.5||u>=3.9) c.drawImage(TX,CX-LS/2,CY-LS/2,LS,LS);
      else draw(c,px,TX,{rx:15,ry:ryAt(u),rz:0,cx:CX,cy:CY,R,shading:.6});
    };
  } },

/* HEX COLUMN. Pen plotter, white pen on coal: concentric hexagons, each a little off true, a dot where each stroke starts, on a
   Hex Column at Depth 180. The ends carry the drawing; each side stretches the band between the outline and 30% in, so the outer
   rings run round the column. Rotate X / Y keyed with a settle: end on (it is the drawing), turned, turned again, end on. */
{ id:'hexprism3d', name:'Hex Column', section:'3D', isNew:true, still:1.9,
  line:'The layer becomes both ends of a six-sided column, and its edges are stretched down the sides.',
  make(px){
    const P=4.8, LS=64, CX=50, CY=50, R=LS/2*.8, TS=512, [TX,tx]=sheet(TS), r=rng(22004);
    tx.fillStyle=COAL; tx.fillRect(0,0,TS,TS);
    const LWp=4, H=TS/2;
    for(let k=0;k<9;k++){ const rr=1-k*.1, pts=circlePts(rr,6).map(p=>[H+(p[0]+(k?(r()-.5)*.02:0))*H*.985,H+(p[1]+(k?(r()-.5)*.02:0))*H*.985]);
      tx.strokeStyle=TEXT; tx.lineWidth=LWp; tx.lineJoin='miter'; tx.beginPath(); pts.forEach((p,i)=>i?tx.lineTo(p[0],p[1]):tx.moveTo(p[0],p[1])); tx.closePath(); tx.stroke();
      tx.fillStyle=TEXT; tx.beginPath(); tx.arc(pts[0][0],pts[0][1],LWp*1.3,0,TAU); tx.fill(); }
    const draw=meshDrawer(bPrism(circlePts(1,6),1.8),TX,true);
    const K=[[0,0,0,0],[.7,.9,24,58],[2.4,.9,336,200],[3.9,.8,0,360]];
    const pose=u=>keyed(K,u,settle,false);
    return (c,t)=>{
      const u=mod(t,P), [rx,ry]=pose(u); reset(c,px);
      c.fillStyle=BONE; c.fillRect(0,0,100,100);
      draw(c,px,TX,{rx:((rx%360)+360)%360,ry,rz:0,cx:CX,cy:CY,R,shading:.6});
    };
  } },

/* OPEN BOX. Comp sheets. A vermilion sheet with crop marks carries the effect (Wall 22, Depth 70, Size 80) over a yellow layer:
   the tube keeps only the sheet's border, has no front and no back, so the yellow underneath shows straight through it. Rotate
   keyed with a settle: face on, the default 25 / 35, the other way, face on. */
{ id:'hollowbox3d', name:'Open Box', section:'3D', isNew:true, still:1.6,
  line:'The layer\'s border becomes a square tube, open at both ends, so you see through it to the layer underneath.',
  make(px){
    const P=4.6, LS=70, CX=50, CY=50, R=LS/2*.8, TS=512, [TX,tx]=sheet(TS);
    tx.fillStyle=VERM; tx.fillRect(0,0,TS,TS);
    tx.strokeStyle=INK; tx.lineWidth=4; const m=TS*.055, L=TS*.075;
    [[m,m,1,1],[TS-m,m,-1,1],[m,TS-m,1,-1],[TS-m,TS-m,-1,-1]].forEach(([x,y,sx,sy])=>{ tx.beginPath(); tx.moveTo(x,y+sy*L); tx.lineTo(x,y); tx.lineTo(x+sx*L,y); tx.stroke(); });
    const wall=.22, inn=1-wall*2, sq=[[-1,-1],[1,-1],[1,1],[-1,1]], si=sq.map(q=>[q[0]*inn,q[1]*inn]), draw=meshDrawer(bTube(sq,si,.7),TX,false,true);
    const K=[[0,0,0,0],[.7,.8,25,35],[2.2,.9,340,325],[3.6,.7,0,0]];
    const pose=u=>keyed(K,u,settle,true);
    return (c,t)=>{
      const u=mod(t,P), [rx,ry]=pose(u); reset(c,px);
      c.fillStyle=YEL; c.fillRect(0,0,100,100);
      draw(c,px,TX,{rx,ry,rz:0,cx:CX,cy:CY,R,shading:.6});
    };
  } },

/* OCTAHEDRON. Viewer overlay. A white diamond with a vermilion band, inside its selection box, made solid at Size 100: face on,
   the octahedron is the diamond exactly (its four front faces are the four quarters of the layer, projected straight on), so the
   band becomes a belt round the middle. Rotate X / Y keyed, eased, with holds. */
{ id:'octahedron3d', name:'Octahedron', section:'3D', isNew:true, still:1.7,
  line:'The layer is projected onto an eight-sided solid, two pyramids base to base.',
  make(px){
    const P=4.6, LS=64, CX=50, CY=48, R=LS/2, TS=512, [TX,tx]=sheet(TS);
    tx.fillStyle=TEXT; tx.beginPath(); tx.moveTo(TS/2,0); tx.lineTo(TS,TS/2); tx.lineTo(TS/2,TS); tx.lineTo(0,TS/2); tx.closePath(); tx.fill();
    tx.globalCompositeOperation='source-atop'; tx.fillStyle=VERM; tx.fillRect(0,TS*.465,TS,TS*.07); tx.globalCompositeOperation='source-over';
    const draw=meshDrawer(bOcta(),TX,true,true);
    const K=[[0,0,0,0],[.6,.7,20,30],[1.9,.8,20,140],[3.2,.8,0,180]];
    const pose=u=>keyed(K,u,E.inOut,false);
    return (c,t)=>{
      const u=mod(t,P), [rx,ry]=pose(u); reset(c,px);
      c.fillStyle=NAVY; c.fillRect(0,0,100,100);
      c.strokeStyle=DIM; c.lineWidth=.5; c.strokeRect(CX-LS/2,CY-LS/2,LS,LS);
      c.fillStyle=TEAL; [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([sx,sy])=>c.fillRect(CX+sx*LS/2-1.2,CY+sy*LS/2-1.2,2.4,2.4));
      /* the flat layer first and last (checker k4: the cut back to it sat exactly on the wrap; now the loop wraps flat to flat) */
      if(u<.5||u>=4.3) c.drawImage(TX,CX-LS/2,CY-LS/2,LS,LS); else draw(c,px,TX,{rx,ry,rz:0,cx:CX,cy:CY,R,shading:.65});
      c.fillStyle=TEAL; c.fillRect(CX-1,CY-1,2,2);
    };
  } },

/* PYRAMID. Black and silver: a ruled plate, a rule every sixteenth of its height and a centre line. Every side of the pyramid shows
   the layer cut to a triangle (its bottom edge on the base, its top centre at the apex), so the rules run round every face as
   level lines and meet at the corners, and the centre line runs up the middle of each face. Rotate X 0 so it turns on its own axis; Auto-spin Y 30 deg/s, drawn
   on threes, from Rotate Y 90 to 180: a square pyramid repeats every quarter turn, and the app's depth sort draws it cleanly there. */
{ id:'pyramid3d', name:'Pyramid', section:'3D', isNew:true, still:1.0,
  line:'Each side of a four-sided pyramid shows the layer, cut to a triangle.',
  make(px){
    const P=3, LS=72, CX=50, CY=45, R=LS/2*.76, TS=512, [TX,tx]=sheet(TS);
    tx.fillStyle=SILVER; tx.fillRect(0,0,TS,TS);
    tx.fillStyle='#000'; for(let k=1;k<16;k++){ const w=k%4===0?7:2.5; tx.fillRect(0,k*TS/16-w/2,TS,w); }   /* a ruled plate: a rule every sixteenth, a heavy one every fourth */
    tx.fillRect(TS/2-1.25,0,2.5,TS);
    const draw=meshDrawer(bPyramid(),TX,true);
    const ryAt=u=>90+30*Math.floor(u*8)/8;
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      c.fillStyle='#000'; c.fillRect(0,0,100,100);
      draw(c,px,TX,{rx:0,ry:ryAt(u),rz:0,cx:CX,cy:CY,R,shading:.65});
    };
  } }

);
})();
