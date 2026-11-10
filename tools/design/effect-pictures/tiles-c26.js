/* FreeMotion effect pictures: Spherize, redrawn by artist 26 (c26). No photograph: a made-up layer, a flat sheet of mirror mosaic.
   SPHERIZE. The real sphere3d on that sheet: Rotate X 15 (its default), Size 85 (default), Perspective 50 (default), Shading .8,
   Auto-spin Y -45 deg/s. The flat sheet first, then the effect switched on, then off. */
(function(){ 'use strict';
const {TAU,clamp,lerp,hash,rng,seg,E}=window.FXK;
const INK='#16130f', COAL='#0c0c0d', DIM='#8b96a8';
const mod=(t,P)=>((t%P)+P)%P;

/* ---- the layer: a flat 2:1 sheet of mirror mosaic, 22 x 14 mirrors. They sit exactly on the effect's own 22 x 14 mesh, so on
   the ball every mirror is one of the effect's flat-shaded facets. The greys are painted into the sheet (what the mirrors happen
   to show: one long diagonal of bright ones, like a window, and a few glints); the light that moves over the ball is the
   effect's own shading. ---- */
const CU=22, CV=14;
function paintSheet(TW){
  const TH=TW/2, C=document.createElement('canvas'); C.width=TW; C.height=TH; const x=C.getContext('2d');
  const cw=TW/CU, ch=TH/CV, g=Math.max(1,Math.min(cw,ch)*.07);
  x.fillStyle=INK; x.fillRect(0,0,TW,TH);
  for(let j=0;j<CV;j++) for(let i=0;i<CU;i++){
    const s=(i+j*131)*7+3, u=(i+.5)/CU, v=(j+.5)/CV;
    /* the streak runs on round the sheet's two ends, so it meets itself where they join */
    const band=Math.exp(-Math.pow(((u-.18)-(v-.5)*.9)*5.2,2))+Math.exp(-Math.pow(((u-1.18)-(v-.5)*.9)*5.2,2));
    const L=hash(s,23)<.14+.55*band*band ? .8+.17*hash(s,29) : .24+.34*hash(s,11);
    x.fillStyle='rgb('+Math.round(lerp(26,238,L))+','+Math.round(lerp(28,235,L))+','+Math.round(lerp(32,228,L))+')';
    x.fillRect(i*cw+g/2,j*ch+g/2,cw-g,ch-g);
  }
  return C;
}

/* ---- sphere3d as js/compositor.js draws it: bParam 22 x 14 (lon=(u-.5)*2pi, lat=(v-.5)*pi), rotate X then Y, weak
   perspective F 3.2, radius 85% of half the layer's long side, each triangle an affine map of the layer with flat Lambert
   shading from (.42,-.55,.72), pushed out 0.4 px to close seams. The sheet is opaque, so the far half never shows and only
   faces turned toward the eye are drawn. (The app also leaves a one-pixel crack where the sheet's two ends meet, seen when
   that seam turns to the front; at these sizes it is under a pixel, so it is not drawn.) ---- */
const NU=22, NV=14, FOC=3.2, SHD=.8, LX=.42, LY=-.55, LZ=.72;
const MV=[], MT=[];
for(let j=0;j<=NV;j++) for(let i=0;i<=NU;i++){ const u=i/NU, v=j/NV, lon=(u-.5)*TAU, lat=(v-.5)*Math.PI; MV.push([Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon),u,v]); }
for(let j=0;j<NV;j++) for(let i=0;i<NU;i++){ const k=j*(NU+1)+i; MT.push([k,k+1,k+NU+2],[k,k+NU+2,k+NU+1]); }
function makeBall(tex){
  const n=MV.length, X=new Float32Array(n), Y=new Float32Array(n), Z=new Float32Array(n), SX=new Float32Array(n), SY=new Float32Array(n);
  const tw=tex.width, th=tex.height, ord=[], zs=new Float32Array(MT.length);
  let pat=null, M=null, SC=null, sx=null;
  return (c,rxD,ryD,cx,cy,R,inf)=>{   /* device pixels; inf = how far each face is pushed out to close hairline seams */
    if(!pat){ pat=c.createPattern(tex,'no-repeat'); M=new DOMMatrix(); }   /* like drawImage: nothing past the sheet's edge */
    /* the faces' shading is painted as greys on a sheet of its own and multiplied on in one go: brightness(s) on an
       opaque face is the face times s, and doing it in one pass leaves no light hairline where two faces meet */
    if(!SC||SC.width!==c.canvas.width||SC.height!==c.canvas.height){ SC=document.createElement('canvas'); SC.width=c.canvas.width; SC.height=c.canvas.height; sx=SC.getContext('2d'); }
    sx.setTransform(1,0,0,1,0,0); sx.globalAlpha=1; sx.globalCompositeOperation='source-over'; sx.fillStyle='#fff'; sx.fillRect(0,0,SC.width,SC.height);
    const rx=rxD*Math.PI/180, ry=ryD*Math.PI/180, cX=Math.cos(rx), sX=Math.sin(rx), cY=Math.cos(ry), sY=Math.sin(ry);
    for(let i=0;i<n;i++){ const v=MV[i]; let x=v[0], y=v[1], z=v[2], w;
      w=y*cX-z*sX; z=y*sX+z*cX; y=w;
      w=x*cY+z*sY; z=-x*sY+z*cY; x=w;
      X[i]=x; Y[i]=y; Z[i]=z; const f=FOC/Math.max(.2,FOC-z); SX[i]=cx+x*f*R; SY[i]=cy+y*f*R; }
    ord.length=0;
    for(let k=0;k<MT.length;k++){ const t=MT[k], a=t[0], b=t[1], d=t[2];
      if((SX[b]-SX[a])*(SY[d]-SY[a])-(SY[b]-SY[a])*(SX[d]-SX[a])<=0) continue;   /* turned away: hidden behind the near half */
      zs[k]=Z[a]+Z[b]+Z[d]; ord.push(k); }
    ord.sort((p,q)=>zs[p]-zs[q]);
    for(const k of ord){ const t=MT[k], a=t[0], b=t[1], d=t[2], va=MV[a], vb=MV[b], vd=MV[d];
      const gx=(SX[a]+SX[b]+SX[d])/3, gy=(SY[a]+SY[b]+SY[d])/3;
      const pt=i=>{ const dx=SX[i]-gx, dy=SY[i]-gy, l=Math.hypot(dx,dy)||1; return [SX[i]+dx/l*inf,SY[i]+dy/l*inf]; };
      const p0=pt(a), p1=pt(b), p2=pt(d);
      const u0=va[3]*tw, v0=va[4]*th, u1=vb[3]*tw, v1=vb[4]*th, u2=vd[3]*tw, v2=vd[4]*th;
      const den=u0*(v1-v2)+u1*(v2-v0)+u2*(v0-v1); if(Math.abs(den)<1e-6) continue;
      const x0=p0[0], y0=p0[1], x1=p1[0], y1=p1[1], x2=p2[0], y2=p2[1];
      M.a=(x0*(v1-v2)+x1*(v2-v0)+x2*(v0-v1))/den; M.b=(y0*(v1-v2)+y1*(v2-v0)+y2*(v0-v1))/den;
      M.c=(x0*(u2-u1)+x1*(u0-u2)+x2*(u1-u0))/den; M.d=(y0*(u2-u1)+y1*(u0-u2)+y2*(u1-u0))/den;
      M.e=x0-M.a*u0-M.c*v0; M.f=y0-M.b*u0-M.d*v0;
      pat.setTransform(M);
      c.beginPath(); c.moveTo(x0,y0); c.lineTo(x1,y1); c.lineTo(x2,y2); c.closePath();
      c.fillStyle=pat; c.fill();
      const e1x=X[b]-X[a], e1y=Y[b]-Y[a], e1z=Z[b]-Z[a], e2x=X[d]-X[a], e2y=Y[d]-Y[a], e2z=Z[d]-Z[a];
      const nx=e1y*e2z-e1z*e2y, ny=e1z*e2x-e1x*e2z, nz=e1x*e2y-e1y*e2x, nl=Math.hypot(nx,ny,nz)||1;
      const lam=Math.abs((nx*LX+ny*LY+nz*LZ)/nl), s=(1-SHD)+SHD*(.25+.75*lam), q=Math.round(s*255);
      sx.fillStyle='rgb('+q+','+q+','+q+')';
      sx.beginPath(); sx.moveTo(x0,y0); sx.lineTo(x1,y1); sx.lineTo(x2,y2); sx.closePath(); sx.fill();
    }
    c.save(); c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='multiply'; c.drawImage(SC,0,0); c.restore();
  };
}

/* the layer's box in tile units: 88 x 44 round the middle; the ball's radius is 85% of half its long side */
const W=88, H=44, CX=50, CY=50, RAD=W/2*.85, ROTX=15, SPIN=-45;

window.FX_TILES.push(
{ id:'sphere3d', name:'Spherize', section:'3D', redrawn:true, still:1.6,
  line:'Wraps the flat layer round a ball you can turn or set spinning: here a sheet of grey tiles becomes a mirror ball.',
  make(px){
    /* the app wraps the layer's own pixels at the size they are drawn, so the sheet is made at exactly that size */
    const P=4.6, tex=paintSheet(Math.max(64,Math.round(W/100*px))), ball=makeBall(tex), sc=px/100;
    return (c,t)=>{
      const u=mod(t,P), on=u>=.75&&u<4.4;
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      c.fillStyle=COAL; c.fillRect(0,0,px,px);
      /* Auto-spin Y runs on the clip's own clock; the effect is switched on at .75 s and off at 4.4 s */
      if(on) ball(c,ROTX,SPIN*u,CX*sc,CY*sc,RAD*sc,.4);   /* the app's own 0.4 px */
      else c.drawImage(tex,(CX-W/2)*sc,(CY-H/2)*sc,W*sc,H*sc);
      /* the layer's box, as the editor marks a selected layer: corners only, so nothing crosses the ball */
      c.setTransform(sc,0,0,sc,0,0); c.fillStyle=DIM;
      const L=4.2, T=.75, x0=CX-W/2-1.6, x1=CX+W/2+1.6, y0=CY-H/2-1.6, y1=CY+H/2+1.6;
      c.fillRect(x0,y0,L,T); c.fillRect(x0,y0,T,L); c.fillRect(x1-L,y0,L,T); c.fillRect(x1-T,y0,T,L);
      c.fillRect(x0,y1-T,L,T); c.fillRect(x0,y1-L,T,L); c.fillRect(x1-L,y1-T,L,T); c.fillRect(x1-T,y1-L,T,L);
    };
  },
  /* the layer itself, so the app's own renderer can be run on exactly this sheet (a scene built by hand in truth.html's page:
     truth.html's own __truth puts a photograph under the effect, not this) */
  layer(TW){ return paintSheet(TW); } },

/* OIL PAINT, redrawn by the art director (ad) for his round-3 note: "the oil paint effect u cant even tell the difference".
   Why the old tile failed: PIXEL_FX.oilpaint is a Kuwahara filter whose Brush size is 1 to 8 FRAME pixels. A whole 1080 frame
   shrunk to a 77 px menu tile puts eight pixels under one, so the change cannot show there at any setting. On a phone at full
   screen it does show, because there the frame is seen at about one pixel per pixel. So this tile shows a 176 px piece of a
   1080 frame (a sunflower's seed head, drawn here, with a little photographic grain), which at menu size is close to that
   one-to-one view. The kernel is ported line for line (64-row strips, Float32 sums, rounded luma, the flattest of four
   (r+1) x (r+1) quadrants, Richer colour 0.3, Detail 0) and run once on those pixels at Brush size 6 of 8. A Bone hairline
   carries the painted version across, holds at the middle so the two can be compared on the same seeds, then covers it. */
{ id:'oilpaint', name:'Oil Paint', section:'Stylize', redrawn:true, still:2.0,
  line:'Seen close up, fine detail like seeds and grain flattens into small daubs of colour, while hard edges stay sharp.',
  make(px){
    const P=5, S=176, BR=6, PUNCH=.3, SS=3, Q=S*SS;
    const cv=n=>{ const C=document.createElement('canvas'); C.width=C.height=n; return [C,C.getContext('2d')]; };
    const R=rng(26);
    /* ---- the picture, drawn at 3x in 0..100 units, then brought down to the frame's own pixels ---- */
    const [BIG,b]=cv(Q); b.setTransform(Q/100,0,0,Q/100,0,0);
    const CX=63, CY=58, RD=29;
    const wall=b.createLinearGradient(0,0,100,100); wall.addColorStop(0,'#86a09a'); wall.addColorStop(.55,'#58746f'); wall.addColorStop(1,'#34494a');
    b.fillStyle=wall; b.fillRect(0,0,100,100);
    for(let i=0;i<240;i++){ b.fillStyle=R()<.5?'rgba(255,250,235,.035)':'rgba(8,28,28,.045)'; b.beginPath(); b.arc(R()*100,R()*100,1+R()*5,0,TAU); b.fill(); }
    /* stem and one leaf, low left */
    b.strokeStyle='#3d5420'; b.lineCap='round'; b.lineWidth=4.2; b.beginPath(); b.moveTo(CX-6,CY+18); b.quadraticCurveTo(CX-12,CY+34,CX-20,104); b.stroke();
    b.save(); b.translate(CX-16,CY+33); b.rotate(-2.75);
    b.beginPath(); b.moveTo(0,0); b.bezierCurveTo(9,-13,30,-12,40,-1); b.bezierCurveTo(30,11,10,13,0,0); b.closePath();
    const lg=b.createLinearGradient(0,-12,0,12); lg.addColorStop(0,'#6f8f36'); lg.addColorStop(1,'#3e5a20'); b.fillStyle=lg; b.fill();
    b.strokeStyle='rgba(200,225,140,.55)'; b.lineWidth=.45; b.beginPath(); b.moveTo(1,0); b.quadraticCurveTo(20,-1.5,39,-1); b.stroke();
    b.lineWidth=.3; for(let k=1;k<6;k++){ const sx=k*6.4; b.beginPath(); b.moveTo(sx,-.6); b.lineTo(sx+5,-7.5+k*.4); b.moveTo(sx,-.4); b.lineTo(sx+5,6.8-k*.4); b.stroke(); }
    b.restore();
    /* the petals, two rings: a back ring, deeper and longer, and a front ring offset by half a petal */
    const petals=[];
    for(let ring=0;ring<2;ring++){ const n=22;
      for(let i=0;i<n;i++){ petals.push({ring,a:(i+(ring?.5:0))*TAU/n+(R()-.5)*.12,L:ring?18+R()*7:23+R()*7,W:ring?4.1+R()*1:4.6+R()*1.1,bend:(R()-.5)*3.4}); } }
    const petalPath=(p)=>{ const r0=RD-3, L=p.L, W=p.W, bd=p.bend; b.beginPath(); b.moveTo(r0,0);
      b.bezierCurveTo(r0+L*.25,-W,r0+L*.72,-W*.85+bd*.6,r0+L,bd); b.bezierCurveTo(r0+L*.72,W*.85+bd*.6,r0+L*.25,W,r0,0); b.closePath(); return r0; };
    /* the flower's soft shadow on the wall, down and right of it: the shapes are drawn far off the canvas and only their shadow lands */
    b.save(); b.shadowColor='rgba(8,24,24,.5)'; b.shadowBlur=3.2*Q/100; b.shadowOffsetX=(300+3.4)*Q/100; b.shadowOffsetY=3.8*Q/100; b.fillStyle='#000';
    b.translate(-300,0);
    for(const p of petals){ b.save(); b.translate(CX,CY); b.rotate(p.a); petalPath(p); b.fill(); b.restore(); }
    b.beginPath(); b.arc(CX,CY,RD,0,TAU); b.fill(); b.restore();
    for(const p of petals){ b.save(); b.translate(CX,CY); b.rotate(p.a); const r0=petalPath(p);
      const g=b.createLinearGradient(r0,0,r0+p.L,0);
      if(p.ring){ g.addColorStop(0,'#b97812'); g.addColorStop(.45,'#eab52c'); g.addColorStop(1,'#f8d257'); }
      else { g.addColorStop(0,'#94580c'); g.addColorStop(.5,'#cf8e1c'); g.addColorStop(1,'#e2a92e'); }
      b.fillStyle=g; b.fill(); b.strokeStyle='rgba(96,52,4,.42)'; b.lineWidth=.28; b.stroke();
      b.strokeStyle='rgba(150,86,6,.3)'; b.lineWidth=.2;
      for(let k=-2;k<=2;k++){ b.beginPath(); b.moveTo(r0+2,k*p.W*.14); b.quadraticCurveTo(r0+p.L*.5,k*p.W*.3+p.bend*.3,r0+p.L*.88,k*p.W*.1+p.bend*.85); b.stroke(); }
      b.restore(); }
    /* the seed head: a dark disc, then Fibonacci seeds (137.5 degrees apart), green and tight at the middle, florets with pollen at the rim */
    const dg=b.createRadialGradient(CX-3,CY-3,1,CX,CY,RD); dg.addColorStop(0,'#4f4a1a'); dg.addColorStop(.35,'#3a2a0f'); dg.addColorStop(.85,'#25150a'); dg.addColorStop(1,'#1a0f07');
    b.fillStyle=dg; b.beginPath(); b.arc(CX,CY,RD,0,TAU); b.fill();
    const NS=1150, BROWN=['#7d5624','#5f3e18','#8d6630','#6c4a1e'];
    for(let i=1;i<=NS;i++){ const f=i/NS, r=RD*.965*Math.sqrt(f), th=i*2.399963, sx=CX+Math.cos(th)*r, sy=CY+Math.sin(th)*r, s=.5+.42*Math.sqrt(f);
      b.save(); b.translate(sx,sy); b.rotate(th); b.beginPath(); b.ellipse(0,0,s*.78,s*.52,0,0,TAU);
      b.fillStyle=f<.1?'#6a6a2c':f<.78?BROWN[(i*7)%4]:'#9a6820'; b.fill(); b.restore();
      if(f>=.1&&f<.78){ b.fillStyle='rgba(222,190,128,.5)'; b.beginPath(); b.arc(sx-s*.22,sy-s*.2,s*.2,0,TAU); b.fill(); }
      if(f>=.78&&((i*13)%5)<3){ b.fillStyle='rgba(236,186,58,.85)'; b.beginPath(); b.arc(sx,sy,s*.34,0,TAU); b.fill(); } }
    /* one light, high on the left */
    b.globalCompositeOperation='multiply'; const lt=b.createLinearGradient(10,6,96,98); lt.addColorStop(0,'#ffffff'); lt.addColorStop(1,'#9d9384'); b.fillStyle=lt; b.fillRect(0,0,100,100);
    b.globalCompositeOperation='source-over';
    const [SRC,s]=cv(S); s.imageSmoothingEnabled=true; s.imageSmoothingQuality='high'; s.drawImage(BIG,0,0,S,S);
    const im=s.getImageData(0,0,S,S), d=im.data, G=rng(9);
    for(let i=0;i<d.length;i+=4){ const n=(G()+G()-1)*10; d[i]+=n; d[i+1]+=n; d[i+2]+=n*.9; }   /* photographic grain */
    s.putImageData(im,0,0);
    /* ---- PIXEL_FX.oilpaint, line for line ---- */
    const oil=(d,W,H,r,detail,punch)=>{
      if(detail>=1) return;
      const out=new Uint8ClampedArray(d), STRIP=64, PW=W+2*r, n=(r+1)*(r+1), src=d;
      for(let ys=0;ys<H;ys+=STRIP){ const ye=Math.min(H,ys+STRIP), hs=ye-ys, LH=hs+2*r;
        const sums=[new Float32Array(PW*LH),new Float32Array(PW*LH),new Float32Array(PW*LH),new Float32Array(PW*LH),new Float32Array(PW*LH),new Float32Array(PW*LH)];
        for(let lr=0;lr<LH;lr++){ const sy=Math.min(H-1,Math.max(0,ys-r+lr));
          for(let xp=0;xp<PW;xp++){ const sx=Math.min(W-1,Math.max(0,xp-r)), i=(sy*W+sx)*4, a=src[i+3]/255, o=lr*PW+xp;
            const Rr=src[i]*a, Gg=src[i+1]*a, Bb=src[i+2]*a, L=Math.round(.299*src[i]+.587*src[i+1]+.114*src[i+2])*a;
            sums[0][o]=Rr; sums[1][o]=Gg; sums[2][o]=Bb; sums[3][o]=a; sums[4][o]=L; sums[5][o]=L*L/(a||1); } }
        for(let k=0;k<6;k++){ const v=sums[k], hz=new Float32Array(PW*LH);
          for(let lr=0;lr<LH;lr++){ let acc=0; const row=lr*PW; for(let xp=0;xp<PW;xp++){ acc+=v[row+xp]; if(xp-r-1>=0) acc-=v[row+xp-r-1]; hz[row+xp]=acc; } }
          for(let xp=0;xp<PW;xp++){ let acc=0; for(let lr=0;lr<LH;lr++){ acc+=hz[lr*PW+xp]; if(lr-r-1>=0) acc-=hz[(lr-r-1)*PW+xp]; v[lr*PW+xp]=acc; } } }
        for(let y=ys;y<ye;y++){ const ly=y-ys;
          for(let x=0;x<W;x++){ const i=(y*W+x)*4, a0=src[i+3]; if(a0===0) continue;
            let best=1e30, bo=0;
            for(let q=0;q<4;q++){ const o=(ly+r+(q>>1)*r)*PW+(x+r+(q&1)*r); const sa=sums[3][o]; if(sa<.5) continue; const mL=sums[4][o]/n, vr=sums[5][o]/n-mL*mL; if(vr<best){ best=vr; bo=o; } }
            const sa=sums[3][bo]; if(sa<.5){ out[i]=src[i]; out[i+1]=src[i+1]; out[i+2]=src[i+2]; out[i+3]=a0; continue; }
            let Rr=sums[0][bo]/sa, Gg=sums[1][bo]/sa, Bb=sums[2][bo]/sa;
            if(punch>0){ const L=.299*Rr+.587*Gg+.114*Bb, k=1+punch*.8; Rr=L+(Rr-L)*k; Gg=L+(Gg-L)*k; Bb=L+(Bb-L)*k; }
            if(detail>0){ Rr+=(src[i]-Rr)*detail; Gg+=(src[i+1]-Gg)*detail; Bb+=(src[i+2]-Bb)*detail; }
            out[i]=Rr; out[i+1]=Gg; out[i+2]=Bb; out[i+3]=a0; } } }
      d.set(out); };
    const od=new Uint8ClampedArray(d); oil(od,S,S,BR,0,PUNCH);
    const [RES,rx]=cv(S); const oi=rx.createImageData(S,S); oi.data.set(od); rx.putImageData(oi,0,0);
    const MONO=sz=>'bold '+sz+'px "Courier Prime","Courier New",monospace';
    const tab=(c,x,y,txt,sz,bg,fg)=>{ c.font=MONO(sz); const w=c.measureText(txt).width+sz*.9; c.fillStyle=bg; c.fillRect(x,y,w,sz*1.5); c.fillStyle=fg; c.textBaseline='middle'; c.textAlign='left'; c.fillText(txt,x+sz*.45,y+sz*.8); return w; };
    const split=u=>u<.5?0:u<1.3?52*E.inOut(seg(u,.5,1.3)):u<2.8?52:u<3.4?lerp(52,100,E.inOut(seg(u,2.8,3.4))):u<4.35?100:100*(1-E.inOut(seg(u,4.35,4.85)));
    const draw=(c,t)=>{
      const u=mod(t,P), x=split(u);
      c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; c.imageSmoothingEnabled=true; c.imageSmoothingQuality='high';
      c.drawImage(SRC,0,0,100,100);
      if(x>.05){ c.save(); c.beginPath(); c.rect(0,0,x,100); c.clip(); c.drawImage(RES,0,0,100,100); c.restore(); }
      if(x>.05&&x<99.95){ c.fillStyle='#e7e2d5'; c.fillRect(x-.35,0,.7,100); }
      if(x>30) tab(c,3,91.4,'BRUSH '+BR,4.4,'#16130f','#e7e2d5');
      if(x<70) tab(c,100-3-(3*.6*4.4+4.4*.9),91.4,'OFF',4.4,'#16130f','#8b96a8');
    };
    draw.truth={type:'oilpaint',params:{radius:BR,detail:0,punch:PUNCH},src:SRC,out:RES};
    return draw;
  } }
);
})();
