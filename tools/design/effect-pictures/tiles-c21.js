/* FreeMotion effect pictures, artist 21 (c21): Sunburst, Speed Lines, Threshold, Cracked Cells, Cross Beam, Box. (Its Cube was taken out:
   the kept 'cube' tile is the same effect.) No photographs: every subject is drawn here. Every change is the effect's own maths, read from js/compositor.js. */
(function(){ 'use strict';
const {TAU,clamp,lerp,seg,E,rng,hash,vnoise,canvasOf}=window.FXK;

const BONE='#e7e2d5', INK='#16130f', COAL='#0c0c0d', NAVY='#161c28', TEXT='#eef2f8', DIM='#8b96a8', VERM='#e4471d', YEL='#ffce4a', PAPER='#d9d4c6', CHINA='#d8321f', DGREEN='#1f7f70', DYEL='#f6c544';
const MONO=s=>'bold '+s+'px "Courier Prime","Courier New",monospace';
const SANS=s=>'800 '+s+'px "Helvetica Neue",Helvetica,Arial,"Segoe UI",system-ui,sans-serif';
const mod=(t,P)=>((t%P)+P)%P;
const reset=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; };
const canvasN=(w,h)=>{ const C=document.createElement('canvas'); C.width=w; C.height=h===undefined?w:h; return [C,C.getContext('2d')]; };
const settle=p=>p<=0?0:p>=1?1:1-Math.pow(2,-8.5*p)*Math.cos(p*9.5);
const RGB=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const tab=(c,x,y,txt,s,bg,fg)=>{ c.font=MONO(s); const w=c.measureText(txt).width; c.fillStyle=bg; c.fillRect(x,y,w+s*.9,s*1.5); c.fillStyle=fg; c.textBaseline='middle'; c.textAlign='left'; c.fillText(txt,x+s*.45,y+s*.8); };

/* ---- the 3D solids' own pipeline (renderMesh in js/compositor.js), without ctx.filter: Euler X then Y then Z, weak perspective
   F 3.2, painter-sorted on the summed z, each triangle an affine map of the WHOLE layer, flat double-sided Lambert with the key
   light at (.42,-.55,.72). The face shading is the app's own no-filter path: black laid over the face at 1 - shade. ---- */
function bBox(wx,wy,wz,sub){ const V=[],T=[];
  const face=(ox,oy,oz,ux,uy,uz,vx,vy,vz)=>{ const b=V.length;
    for(let j=0;j<=sub;j++) for(let i=0;i<=sub;i++){ const fu=i/sub, fv=j/sub; V.push([ox+ux*fu+vx*fv,oy+uy*fu+vy*fv,oz+uz*fu+vz*fv,fu,fv]); }
    for(let j=0;j<sub;j++) for(let i=0;i<sub;i++){ const k=b+j*(sub+1)+i; T.push([k,k+1,k+sub+2],[k,k+sub+2,k+sub+1]); } };
  face(-wx,-wy,wz,2*wx,0,0,0,2*wy,0); face(wx,-wy,-wz,-2*wx,0,0,0,2*wy,0); face(wx,-wy,wz,0,0,-2*wz,0,2*wy,0);
  face(-wx,-wy,-wz,0,0,2*wz,0,2*wy,0); face(-wx,-wy,-wz,2*wx,0,0,0,0,2*wz); face(-wx,wy,wz,2*wx,0,0,0,0,-2*wz);
  return {v:V,t:T}; }
function meshMerge(list){ const V=[],T=[]; for(const m of list){ const o=V.length; for(const v of m.v) V.push(v); for(const t of m.t) T.push([t[0]+o,t[1]+o,t[2]+o]); } return {v:V,t:T}; }
function drawSolid(c,tex,mesh,o){
  const D=Math.PI/180, cX=Math.cos(o.rx*D), sX=Math.sin(o.rx*D), cY=Math.cos(o.ry*D), sY=Math.sin(o.ry*D), cZ=Math.cos(o.rz*D), sZ=Math.sin(o.rz*D);
  const V=mesh.v, T=mesh.t, n=V.length, F=3.2, PX=new Float32Array(n), PY=new Float32Array(n), X3=new Float32Array(n), Y3=new Float32Array(n), Z3=new Float32Array(n);
  for(let i=0;i<n;i++){ let x=V[i][0], y=V[i][1], z=V[i][2], w;
    w=y*cX-z*sX; z=y*sX+z*cX; y=w; w=x*cY+z*sY; z=-x*sY+z*cY; x=w; w=x*cZ-y*sZ; y=x*sZ+y*cZ; x=w;
    X3[i]=x; Y3[i]=y; Z3[i]=z; const f=F/Math.max(.2,F-z); PX[i]=o.cx+x*f*o.R; PY[i]=o.cy+y*f*o.R; }
  const order=T.map((t,i)=>i), zs=T.map(t=>Z3[t[0]]+Z3[t[1]]+Z3[t[2]]); order.sort((a,b)=>zs[a]-zs[b]);
  const tw=tex.width, th=tex.height, Lx=.42, Ly=-.55, Lz=.72, inf=o.infl||.12;
  /* the layer as a pattern: each triangle is one fill with the triangle's own affine map, which draws exactly what clip +
     transform + drawImage draws, without a clip per triangle (a clip each was 10 ms a frame at 600 px) */
  const pat=c.createPattern(tex,'no-repeat'), canPat=pat&&typeof pat.setTransform==='function'&&typeof DOMMatrix==='function';
  c.globalAlpha=1;
  for(const k of order){ const t=T[k], i0=t[0], i1=t[1], i2=t[2];
    const gx=(PX[i0]+PX[i1]+PX[i2])/3, gy=(PY[i0]+PY[i1]+PY[i2])/3, pt=[i0,i1,i2].map(i=>{ const dx=PX[i]-gx, dy=PY[i]-gy, l=Math.hypot(dx,dy)||1; return [PX[i]+dx/l*inf,PY[i]+dy/l*inf]; });
    const u0=V[i0][3]*tw, v0=V[i0][4]*th, u1=V[i1][3]*tw, v1=V[i1][4]*th, u2=V[i2][3]*tw, v2=V[i2][4]*th, den=u0*(v1-v2)+u1*(v2-v0)+u2*(v0-v1);
    if(Math.abs(den)<1e-6) continue;
    const x0=pt[0][0], y0=pt[0][1], x1=pt[1][0], y1=pt[1][1], x2=pt[2][0], y2=pt[2][1];
    const ma=(x0*(v1-v2)+x1*(v2-v0)+x2*(v0-v1))/den, mb=(y0*(v1-v2)+y1*(v2-v0)+y2*(v0-v1))/den, mc=(x0*(u2-u1)+x1*(u0-u2)+x2*(u1-u0))/den, md=(y0*(u2-u1)+y1*(u0-u2)+y2*(u1-u0))/den, me=x0-ma*u0-mc*v0, mf=y0-mb*u0-md*v0;
    const e1x=X3[i1]-X3[i0], e1y=Y3[i1]-Y3[i0], e1z=Z3[i1]-Z3[i0], e2x=X3[i2]-X3[i0], e2y=Y3[i2]-Y3[i0], e2z=Z3[i2]-Z3[i0];
    const nx=e1y*e2z-e1z*e2y, ny=e1z*e2x-e1x*e2z, nz=e1x*e2y-e1y*e2x, nl=Math.hypot(nx,ny,nz)||1, lam=Math.abs((nx*Lx+ny*Ly+nz*Lz)/nl), shade=(1-o.shading)+o.shading*(.25+.75*lam);
    c.beginPath(); c.moveTo(x0,y0); c.lineTo(x1,y1); c.lineTo(x2,y2); c.closePath();
    if(canPat){ pat.setTransform(new DOMMatrix([ma,mb,mc,md,me,mf])); c.fillStyle=pat; c.fill(); }
    else { c.save(); c.clip(); c.transform(ma,mb,mc,md,me,mf); c.drawImage(tex,0,0); c.restore(); }
    if(shade<.999){ c.globalAlpha=1-shade; c.fillStyle='#000'; c.fill(); c.globalAlpha=1; } }
  c.globalAlpha=1;
}

window.FX_TILES.push(

/* SUNBURST. Two-ink print. The kernel's own ray: cos(Rays x angle) x .5 + .5, times Intensity, mixed into the layer's pixels toward the
   ray colour. Rays 24, Source X 9 Y 91 (low in a corner, so the burst fans across the frame), Intensity 80, colour Ink, on a vermilion
   layer. Ray edges Soft (the default), then Hard, then Rotation keyed half a ray along (7.5°), so the inks swap places. The soft field is built once round the source and only turned when drawn. */
{ id:'rays', name:'Sunburst', section:'Generative', isNew:true, still:3.0,
  line:'Rays fan out from a point you place and mix into the layer, soft by default or hard-edged.',
  make(px){
    const P=4.4, N=24, SX=9, SY=91, INT=.8, RC=RGB(INK), STEP=TAU/N;
    const R=Math.ceil(Math.hypot(Math.max(SX,100-SX),Math.max(SY,100-SY)))+2;
    const M=Math.max(64,Math.min(560,Math.round(2*R*px/100/1.6))), [SM,sm]=canvasN(M), im=sm.createImageData(M,M), d=im.data, h=(M-1)/2;
    for(let y=0;y<M;y++) for(let x=0;x<M;x++){ const a=Math.atan2(y-h,x-h), v=(Math.cos(a*N)*.5+.5)*INT, o=(y*M+x)*4; d[o]=RC[0]; d[o+1]=RC[1]; d[o+2]=RC[2]; d[o+3]=Math.round(v*255); }
    sm.putImageData(im,0,0);
    /* Hard: cos(N a) >= 0, i.e. N wedges of half a step each; the kernel smooths the edge over one pixel, as canvas does */
    const hard=(c,ph)=>{ c.globalAlpha=INT; c.fillStyle=INK; c.beginPath();
      for(let k=0;k<N;k++){ const a0=k*STEP-STEP/4-ph, a1=k*STEP+STEP/4-ph; c.moveTo(SX,SY); c.lineTo(SX+Math.cos(a0)*R,SY+Math.sin(a0)*R); c.lineTo(SX+Math.cos(a1)*R,SY+Math.sin(a1)*R); c.closePath(); }
      c.fill(); c.globalAlpha=1; };
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      const mode=u<.5?0:u<1.6?1:u<3.9?2:0, ph=u<2.0?0:(STEP/2)*settle(seg(u,2.0,2.8));
      c.fillStyle=VERM; c.fillRect(0,0,100,100);
      if(mode===1){ c.save(); c.translate(SX,SY); c.rotate(-ph); c.drawImage(SM,-R,-R,2*R,2*R); c.restore(); }
      else if(mode===2) hard(c,ph);
    };
  } },

/* SPEED LINES. Cut paper. The kernel's Parallel lines exactly: its hash, Lines 40, Angle 180 (points downstream, to the left), Length 55,
   Weight 26 px of a 1080 frame, Scatter .5, Clear zone 26 stretched to 160 %, Focus on the runner; Boil 10 Hz redraws them, salted per
   redraw as the kernel salts them. The lines sit on the bone background layer; the runner is a separate cut-paper layer above it. */
{ id:'speedlines', name:'Speed Lines', section:'Generative', isNew:true, still:2.0,
  line:'Tapered ink lines streak across the picture with a clear space left round the subject; Boil redraws them several times a second.',
  make(px){
    const P=4, BOIL=10, COUNT=40, ANG=Math.PI, FX=54, FY=47, maxR=Math.hypot(100,100)/2, innerR=.26*maxR, lenR=.55*maxR, wid=26/10.8, jit=.5, zk=1.6, zsx=Math.sqrt(zk), zsy=1/zsx;
    const hash0=n=>{ n=(n^61)^(n>>>16); n=n+(n<<3); n=n^(n>>>4); n=Math.imul(n,0x27d4eb2d); n=n^(n>>>15); return (n>>>0)/4294967296; };
    const ux=Math.cos(ANG), uy=Math.sin(ANG), vx=-uy, vy=ux;
    let u0=Infinity,u1=-Infinity,v0=Infinity,v1=-Infinity;
    [[0,0],[100,0],[0,100],[100,100]].forEach(q=>{ const dx=q[0]-FX, dy=q[1]-FY, a=dx*ux+dy*uy, b=dx*vx+dy*vy; u0=Math.min(u0,a); u1=Math.max(u1,a); v0=Math.min(v0,b); v1=Math.max(v1,b); });
    const gap=(v1-v0)/COUNT, lenP=lenR/maxR*(u1-u0);
    const [IK,ik]=canvasN(px); let last=-1;
    const ink=fr=>{ if(fr===last) return; last=fr; const salt=fr>0?Math.imul(fr,0x9E3779B1):0, hs=salt?n=>hash0((n+salt)|0):hash0;
      ik.setTransform(1,0,0,1,0,0); ik.globalCompositeOperation='source-over'; ik.clearRect(0,0,px,px); ik.setTransform(px/100,0,0,px/100,0,0);
      ik.fillStyle=INK;
      for(let i=0;i<COUNT;i++){ const h1=hs(i*3+1), h2=hs(i*3+2), h3=hs(i*3+3), h4=hs((i*3+1)^0x5bd1e995);
        const v=v0+(i+.5+(h1-.5)*2*jit)*gap, len=lenP*(.55+.9*h3), uc=u0+(u1-u0)*h4, ub=uc-len/2, ut=uc+len/2, hw=wid*(.35+.85*h2)*.5;
        const bx=FX+ux*ub+vx*v, by=FY+uy*ub+vy*v;
        ik.beginPath(); ik.moveTo(bx+vx*hw,by+vy*hw); ik.lineTo(bx-vx*hw,by-vy*hw); ik.lineTo(FX+ux*ut+vx*v,FY+uy*ut+vy*v); ik.closePath(); ik.fill(); }
      ik.save(); ik.translate(FX,FY); ik.scale(zsx,zsy);
      const g=ik.createRadialGradient(0,0,innerR*.35,0,0,innerR*1.25); g.addColorStop(0,'rgba(0,0,0,1)'); g.addColorStop(1,'rgba(0,0,0,0)');
      ik.globalCompositeOperation='destination-out'; ik.fillStyle=g; ik.beginPath(); ik.arc(0,0,innerR*1.25,0,TAU); ik.fill(); ik.restore(); ik.globalCompositeOperation='source-over'; };
    /* the runner: one cut-paper figure, scissor-straight limbs, nothing quite true */
    const limb=(c,pts,w)=>{ c.lineWidth=w; c.beginPath(); c.moveTo(pts[0],pts[1]); for(let i=2;i<pts.length;i+=2) c.lineTo(pts[i],pts[i+1]); c.stroke(); };
    const runner=c=>{ c.strokeStyle=VERM; c.fillStyle=VERM; c.lineCap='butt'; c.lineJoin='miter'; c.miterLimit=3;
      limb(c,[58.5,31, 49.5,38.5, 43.5,30.5],5.6);          /* back arm */
      limb(c,[49,52, 40.5,63, 29.5,70.5],6.6);              /* back leg, pushing off */
      limb(c,[59,30.5, 50.5,52.5],9.6);                     /* torso, leaning in */
      limb(c,[50,51, 62,57.5, 58.5,71.5],6.6);              /* front leg, knee up */
      limb(c,[59.5,31.5, 66.5,40.5, 73.5,33],5.6);          /* front arm */
      c.beginPath(); c.moveTo(62.2,15.6); c.lineTo(68.6,18.4); c.lineTo(68.2,25.4); c.lineTo(62,27.8); c.lineTo(57.2,22.8); c.lineTo(58.2,17.6); c.closePath(); c.fill(); };
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      c.fillStyle=BONE; c.fillRect(0,0,100,100);
      if(u>=.6&&u<3.55){ ink(Math.floor(u*BOIL)); c.setTransform(1,0,0,1,0,0); c.drawImage(IK,0,0); reset(c,px); }
      runner(c);
    };
  } },

/* THRESHOLD. Brush and paper. thresholdPixels on a photographed dry-brush ensō (white paint on black): every pixel at or above the
   Level becomes the Above colour (Bone), the rest the Below colour (Ink). The soft source is shown first; Level then holds at .5 (the
   default), drops to .30 (the faint dry bristles cross the cut and the stroke fills in), climbs to .66 (only the loaded paint is left)
   and comes back, stepped at 12 frames a second. */
{ id:'threshold', name:'Threshold', section:'Generative', isNew:true, still:1.0,
  line:'Everything brighter than the level turns one colour and everything darker the other; move the level and the shape fills in or breaks up.',
  make(px){
    const P=4.6, N=Math.min(px,360), A=RGB(BONE), B=RGB(INK);
    const [S,s]=canvasN(N); s.setTransform(N/100,0,0,N/100,0,0);
    const g=s.createLinearGradient(0,0,100,100); g.addColorStop(0,'rgb(40,39,37)'); g.addColorStop(1,'rgb(10,10,10)'); s.fillStyle=g; s.fillRect(0,0,100,100);
    /* the source: one dry-brush ensō in white paint, loaded at the start and running out of paint bristle by bristle */
    const RB=rng(9), NB=52, CX=48, CY=51, RAD=32, A0=-1.5, SWEEP=5.5, W0=17, STEPS=260;
    s.globalCompositeOperation='lighter'; s.lineCap='round'; s.strokeStyle='rgb(96,94,90)';
    for(let b=0;b<NB;b++){ const off=(b/(NB-1)-.5), load=.3+.7*RB(), dry=.6+.38*RB(), wob=RB()*TAU, lw=W0/NB*2.2;
      let px0=null, py0=null;
      for(let k=0;k<=STEPS;k++){ const f=k/STEPS, a=A0+f*SWEEP, press=1-.45*f, r=RAD+off*W0*press+.8*Math.sin(f*7+wob)*(.2+f), x=CX+Math.cos(a)*r, y=CY+Math.sin(a)*r;
        let paint=load*clamp((dry-f)/.22+.2)*(1-.4*Math.abs(off)*2)*(.75+.25*vnoise(f*11+b*1.7,b+40));
        if(f>dry*.55&&vnoise(f*30+b*3.1,b)>.2) paint*=.2;
        if(k===0||paint<=.01){ px0=x; py0=y; continue; }
        s.globalAlpha=Math.round(clamp(paint)*1000)/1000; s.lineWidth=lw; s.beginPath(); s.moveTo(px0,py0); s.lineTo(x,y); s.stroke(); px0=x; py0=y; } }
    s.globalCompositeOperation='source-over'; s.globalAlpha=1;
    s.setTransform(1,0,0,1,0,0);
    const im=s.getImageData(0,0,N,N), d=im.data, n=N*N, L=new Float32Array(n), tmp=new Float32Array(n);
    for(let i=0;i<n;i++) L[i]=.299*d[i*4]+.587*d[i*4+1]+.114*d[i*4+2];
    /* a little softness, as a photographed stroke has: three box passes each way, a near-Gaussian under 1 % of the frame */
    const r=Math.max(1,Math.round(N*.006)), M1=N-1, box=(src,dst,horiz)=>{ const k=1/(2*r+1), st=horiz?1:N, ln=horiz?N:1;
      for(let a=0;a<N;a++){ const base=a*ln; let sum=0;
        for(let b=-r;b<=r;b++) sum+=src[base+(b<0?0:b>M1?M1:b)*st];
        for(let b=0;b<N;b++){ dst[base+b*st]=sum*k; const ad=b+r+1, sb=b-r; sum+=src[base+(ad>M1?M1:ad)*st]-src[base+(sb<0?0:sb)*st]; } } };
    for(let q=0;q<3;q++){ box(L,tmp,true); box(tmp,L,false); }
    for(let i=0;i<n;i++){ const v=L[i]; d[i*4]=d[i*4+1]=d[i*4+2]=v; d[i*4+3]=255; }
    s.putImageData(im,0,0);
    const LV=[], LO=.30, HI=.66, ST=.04, NL=Math.round((HI-LO)/ST)+1;
    const level=j=>{ if(LV[j]) return LV[j]; const cut=(LO+j*ST)*255, [C,x]=canvasN(N), o=x.createImageData(N,N), q=o.data;
      for(let i=0;i<n;i++){ const k=clamp((L[i]-cut)/4+.5); q[i*4]=B[0]+(A[0]-B[0])*k; q[i*4+1]=B[1]+(A[1]-B[1])*k; q[i*4+2]=B[2]+(A[2]-B[2])*k; q[i*4+3]=255; }
      x.putImageData(o,0,0); return LV[j]=C; };
    for(let j=0;j<NL;j++) level(j);
    const lvAt=f=>f<1.4?.5:f<1.9?lerp(.5,.30,E.inOut(seg(f,1.4,1.9))):f<2.45?.30:f<3.15?lerp(.30,.66,E.inOut(seg(f,2.45,3.15))):f<3.65?.66:lerp(.66,.5,E.inOut(seg(f,3.65,4.0)));
    return (c,t)=>{
      const u=mod(t,P), f=Math.floor(u*12)/12;
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      if(u<.55||u>=4.2){ c.drawImage(S,0,0,px,px); return; }
      const j=clamp(Math.round((lvAt(f)-LO)/ST),0,NL-1); c.drawImage(LV[j],0,0,px,px);
    };
  } },

/* CRACKED CELLS. A colour-field painting, cracked. The kernel's own cells: Cells 8 across, its sin hash for the seeds, Randomness 1,
   Fill Seed colour (each cell takes the picture's colour under its seed), Edge .7, Wall 12 %. Motion is keyed 0 to .4 and back at
   Speed .5, so the seeds orbit their places with the kernel's 1 : .73 clocks and are home again at the seam. Drawn as the exact
   cells of those seeds, with the wall's linear darkening laid in three bands. */
{ id:'voronoi', name:'Cracked Cells', section:'Generative', isNew:true, still:2.4,
  line:'The picture breaks into cells, each filled with one colour taken from the picture, with dark cracks between them; the cells can drift.',
  make(px){
    const P=4.8, NC=8, G=100/NC, WALL=.12, EDGE=.7, SPD=.5, GX=Math.ceil(100/G)+2, SN=200;
    /* the source: one painted field and two soft blocks, lit from the top left */
    const [SRC,sx]=canvasN(px); sx.setTransform(px/100,0,0,px/100,0,0);
    sx.fillStyle=DGREEN; sx.fillRect(0,0,100,100);
    /* soft-edged blocks: the edge feathered over about 4 units, the way a brushed field fades into the ground */
    const block=(x,y,w,h,col)=>{ for(let k=5;k>=0;k--){ const e=k*.8; sx.globalAlpha=k?.2:1; sx.fillStyle=col; sx.fillRect(x-e,y-e,w+2*e,h+2*e); } sx.globalAlpha=1; };
    block(11,9,78,41,BONE); block(11,58,78,31,'#2a2620');
    /* one light, high on the left: everything falls off toward the bottom right, so neighbouring cells pick up different tones */
    const lg=sx.createRadialGradient(14,8,2,14,8,128); lg.addColorStop(0,'rgba(255,248,228,.22)'); lg.addColorStop(.45,'rgba(0,0,0,.08)'); lg.addColorStop(1,'rgba(0,0,0,.62)'); sx.fillStyle=lg; sx.fillRect(0,0,100,100);
    const [SS,ss]=canvasN(SN); ss.drawImage(SRC,0,0,SN,SN); const sd=ss.getImageData(0,0,SN,SN).data;
    const H=(ix,iy,k)=>{ const v=Math.sin(ix*127.1+iy*311.7+k*74.7)*43758.5453; return v-Math.floor(v); };
    const S=[]; for(let gy=0;gy<GX;gy++) for(let gx=0;gx<GX;gx++){ const cx=gx-1, cy=gy-1; S.push({gx,gy,cx,cy,ox:H(cx,cy,1),oy:H(cx,cy,2),p3:H(cx,cy,3)*TAU,p4:H(cx,cy,4)*TAU,x:0,y:0}); }
    for(const s of S) s.nb=S.filter(q=>q!==s&&Math.abs(q.gx-s.gx)<=2&&Math.abs(q.gy-s.gy)<=2);   /* every seed that can share a wall with this one */
    const clip=(poly,ax,ay,bx,by)=>{ /* keep the side nearer seed a than seed b */
      const mx=(ax+bx)/2, my=(ay+by)/2, nx=bx-ax, ny=by-ay, out=[]; const f=p=>(p[0]-mx)*nx+(p[1]-my)*ny;
      for(let i=0;i<poly.length;i++){ const p=poly[i], q=poly[(i+1)%poly.length], fp=f(p), fq=f(q); if(fp<=0) out.push(p); if((fp<0)!==(fq<0)&&fp!==fq){ const s=fp/(fp-fq); out.push([p[0]+(q[0]-p[0])*s,p[1]+(q[1]-p[1])*s]); } }
      return out; };
    const motion=u=>u<1.0?0:u<1.7?.4*E.inOut(seg(u,1.0,1.7)):u<3.3?.4:u<4.0?.4*(1-E.inOut(seg(u,3.3,4.0))):0;
    /* the walls, per pixel as the kernel does them: the nearest and next-nearest seed among the 3 x 3 grid cells round the pixel,
       ew = d2 - d1, darkened by 1 - Edge x (1 - ew / (cell x Wall)) where ew is under cell x Wall; built at WS px, laid over the cells */
    const WS=Math.min(px,150), [WM,wm]=canvasN(WS), wi=wm.createImageData(WS,WS), wd=wi.data, WL=G*WALL, PXg=new Float64Array(GX*GX), PYg=new Float64Array(GX*GX), k=100/WS;
    const XC=new Float64Array(WS), XG=new Int32Array(WS); for(let x=0;x<WS;x++){ XC[x]=(x+.5)*k; XG[x]=Math.floor(XC[x]/G); }
    const A255=255*EDGE, WL2=WL*WL;
    const walls=()=>{ for(const s of S){ PXg[s.gy*GX+s.gx]=s.x; PYg[s.gy*GX+s.gx]=s.y; }
      let o=3;
      for(let y=0;y<WS;y++){ const Y=XC[y], y0=XG[y];
        for(let x=0;x<WS;x++,o+=4){ const X=XC[x], x0=XG[x]; let D1=1e18, D2=1e18;
          for(let oy=0;oy<3;oy++){ const row=(y0+oy)*GX+x0; for(let ox=0;ox<3;ox++){ const J=row+ox, dx=X-PXg[J], dy=Y-PYg[J], dd=dx*dx+dy*dy; if(dd<D1){ D2=D1; D1=dd; } else if(dd<D2) D2=dd; } }
          if(D2-D1>=WL2+2*WL*Math.sqrt(D1)){ wd[o]=0; continue; }   /* sqrt(D2) - sqrt(D1) >= cell x Wall: not a wall */
          const ew=Math.sqrt(D2)-Math.sqrt(D1); wd[o]=(A255*(1-ew/WL)+.5)|0; } }
      wm.putImageData(wi,0,0); };
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      if(u<.5||u>=4.3){ c.setTransform(1,0,0,1,0,0); c.drawImage(SRC,0,0); return; }
      const R=motion(u)*.34, w=u*SPD*TAU;
      for(const s of S){ s.x=(s.cx+s.ox+(R?R*Math.cos(w+s.p3):0))*G; s.y=(s.cy+s.oy+(R?R*Math.sin(w*.73+s.p4):0))*G; }
      c.drawImage(SRC,0,0,100,100);   /* under the cells, so no hairline between two of them can show last frame */
      for(const s of S){ if(s.x<-2*G||s.x>100+2*G||s.y<-2*G||s.y>100+2*G) continue;
        let poly=[[-1,-1],[101,-1],[101,101],[-1,101]];
        for(const q of s.nb){ poly=clip(poly,s.x,s.y,q.x,q.y); if(poly.length<3) break; }
        if(poly.length<3) continue;
        const ix=clamp(Math.round(s.x/100*SN),0,SN-1), iy=clamp(Math.round(s.y/100*SN),0,SN-1), o=(iy*SN+ix)*4;
        c.fillStyle='rgb('+sd[o]+','+sd[o+1]+','+sd[o+2]+')';
        c.beginPath(); for(let i=0;i<poly.length;i++) i?c.lineTo(poly[i][0],poly[i][1]):c.moveTo(poly[i][0],poly[i][1]); c.closePath(); c.fill(); }
      walls(); c.drawImage(WM,0,0,100,100);
    };
  } },

/* CROSS BEAM. Viewer navy, an editor's ruler. axiscross3d's own mesh, three bBox(1, arm/2, arm/2, 2) beams, each face carrying the
   whole layer, here a 2 : 1 length of measuring tape. Rotate X 25, Y 35 and Shading .6 (the defaults), Size 92; Arm Width is what is
   keyed, 34 (the default) to 52 to 20 and back, landing with a small overshoot, stepped at 25 fps. */
{ id:'axiscross3d', name:'Cross Beam', section:'3D', isNew:true, still:2.2,
  line:'The layer is wrapped round three crossed beams in 3D; Arm Width makes the beams thicker or thinner.',
  make(px){
    const P=4.6, LX=8, LY=29, LW=84, LH=42, TW=480, TH=240, [TX,tx]=canvasN(TW,TH);
    /* the layer: a length of measuring tape, ticks along both edges, every tenth numbered */
    tx.fillStyle=YEL; tx.fillRect(0,0,TW,TH); tx.fillStyle=INK;
    const NT=40, dx=TW/NT;
    for(let i=1;i<NT;i++){ const x=i*dx, L=i%10===0?.3:i%5===0?.2:.11, w=i%10===0?4:3; tx.fillRect(x-w/2,0,w,TH*L); tx.fillRect(x-w/2,TH*(1-L),w,TH*L); }
    tx.font='800 '+Math.round(TH*.26)+'px "Helvetica Neue",Helvetica,Arial,sans-serif'; tx.textAlign='center'; tx.textBaseline='middle';
    for(let i=10;i<NT;i+=10) tx.fillText(String(i),i*dx,TH*.52);
    tx.fillRect(0,0,TW,3); tx.fillRect(0,TH-3,TW,3);
    const cache={};
    const mesh=arm=>{ const k=arm.toFixed(3); return cache[k]||(cache[k]=meshMerge([bBox(1,arm/2,arm/2,2),bBox(arm/2,1,arm/2,2),bBox(arm/2,arm/2,1,2)])); };
    const SIZE=.92, R=Math.max(LW,LH)/2*SIZE;
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      c.fillStyle=NAVY; c.fillRect(0,0,100,100);
      if(u<.5||u>=4.25){ c.drawImage(TX,LX,LY,LW,LH); return; }
      const f=Math.floor(u*25)/25;
      const arm=f<1.3?34:f<2.0?lerp(34,52,settle(seg(f,1.3,2.0))):f<2.6?52:f<3.3?lerp(52,20,settle(seg(f,2.6,3.3))):f<3.75?20:lerp(20,34,E.inOut(seg(f,3.75,4.15)));
      drawSolid(c,TX,mesh(Math.round(arm)/100),{cx:LX+LW/2,cy:LY+LH/2,R,rx:25,ry:35,rz:0,shading:.6,infl:.15});
      c.font=MONO(5); c.fillStyle=DIM; c.textAlign='left'; c.textBaseline='alphabetic'; c.fillText('ARM '+Math.round(arm)+'%',3.5,96.5);
    };
  } },

/* BOX. Contact sheet. box3d's own mesh, bBox(1, 9/16, Depth/2, 3): the box takes the layer's own shape, a 16 : 9 frame of film on its
   rebate, and every face carries the whole frame. Rotate X 22, Y 322, Size 80, Shading .6; Depth steps 10, 60 (the default), 140 on
   twos, as a darkroom proof would. */
{ id:'box3d', name:'Box', section:'3D', isNew:true, still:2.3,
  line:'The layer becomes a box the same shape as the layer, with the picture on every face; Depth makes it thicker.',
  make(px){
    const P=4.8, LW=86, LH=LW*9/16, LX=7, LY=(100-LH)/2+2, TW=384, TH=216, [TX,tx]=canvasN(TW,TH);
    /* the layer: one frame of black-and-white film on its rebate, sprockets above and below, a chinagraph frame number */
    tx.fillStyle=COAL; tx.fillRect(0,0,TW,TH);
    const hole=TW/16; for(let i=0;i<16;i++){ tx.fillStyle=PAPER; const x=i*hole+hole*.28; tx.fillRect(x,TH*.035,hole*.44,TH*.075); tx.fillRect(x,TH*.89,hole*.44,TH*.075); }
    const fx=TW*.05, fy=TH*.15, fw=TW*.9, fh=TH*.70;
    /* the frame: a dark room, one tall window, and the patch of light it throws across the floor */
    const room=tx.createLinearGradient(fx,fy,fx+fw,fy+fh); room.addColorStop(0,'#55534d'); room.addColorStop(1,'#1d1c19'); tx.fillStyle=room; tx.fillRect(fx,fy,fw,fh);
    tx.fillStyle='#2b2a26'; tx.fillRect(fx,fy+fh*.66,fw,fh*.34);
    const wx=fx+fw*.18, wy=fy+fh*.12, ww=fw*.15, wh=fh*.5;
    tx.fillStyle='#e9e6dc'; tx.fillRect(wx,wy,ww,wh);
    tx.fillStyle='#3a3934'; tx.fillRect(wx+ww*.46,wy,ww*.08,wh); tx.fillRect(wx,wy+wh*.46,ww,wh*.06);
    tx.fillStyle='rgba(222,218,206,.82)'; tx.beginPath(); tx.moveTo(wx+ww*.1,fy+fh*.74); tx.lineTo(wx+ww*1.05,fy+fh*.74); tx.lineTo(wx+ww*2.9,fy+fh*.97); tx.lineTo(wx+ww*1.3,fy+fh*.97); tx.closePath(); tx.fill();
    tx.fillStyle='#3a3934'; tx.beginPath(); tx.moveTo(wx+ww*.6,fy+fh*.74); tx.lineTo(wx+ww*.66,fy+fh*.74); tx.lineTo(wx+ww*2.16,fy+fh*.97); tx.lineTo(wx+ww*2.04,fy+fh*.97); tx.closePath(); tx.fill();
    const R0=rng(7); for(let i=0;i<900;i++){ tx.globalAlpha=.08+R0()*.1; tx.fillStyle=R0()<.5?'#000':'#fff'; tx.fillRect(fx+R0()*fw,fy+R0()*fh,1.2,1.2); } tx.globalAlpha=1;
    tx.font='bold '+Math.round(TH*.075)+'px "Courier Prime","Courier New",monospace'; tx.fillStyle=CHINA; tx.textBaseline='middle'; tx.textAlign='left'; tx.fillText('12A',TW*.06,TH*.92-TH*.002);
    const cache={}, mesh=d=>cache[d]||(cache[d]=bBox(1,9/16,d/100*.5,3)), R=Math.max(LW,LH)/2*.8;
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      c.fillStyle=PAPER; c.fillRect(0,0,100,100);
      if(u<.55||u>=4.4){ c.drawImage(TX,LX,LY,LW,LH); return; }
      const f=Math.floor(u*12)/12;
      const dep=f<1.0?10:f<1.7?lerp(10,60,settle(seg(f,1.0,1.7))):f<2.4?60:f<3.1?lerp(60,140,settle(seg(f,2.4,3.1))):f<3.7?140:f<4.2?lerp(140,10,E.inOut(seg(f,3.7,4.2))):10;
      drawSolid(c,TX,mesh(Math.max(10,Math.round(dep))),{cx:LX+LW/2,cy:LY+LH/2,R,rx:22,ry:322,rz:0,shading:.6,infl:.14});
      tab(c,4,4,'DEPTH '+Math.round(dep),4.4,INK,PAPER);
    };
  } }

/* CUBE (type 'cube3d') was drawn here too and has been taken out by the art director (ad): the kept 'cube' tile already IS this effect (truth.html ALIAS cube -> cube3d), so the menu showed two Cubes. */

);
})();
