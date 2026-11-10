/* FreeMotion effect pictures, artist 14 (c14): Glow Inward, Torn Edge, Raised Edge, Soft Outline, Bend, Pinch / Bulge and
   Chromatic Aberration. No photographs: every subject is drawn here, and every change is the effect's own kernel from
   js/compositor.js, ported line for line and run on that drawing. F is how many project px a tile's 100 units show: a whole
   1080 frame is F 1080, a 200 % viewer is F 540, and every px-sized setting is scaled by it. */
(function(){ 'use strict';
const {TAU,clamp,lerp,seg,E,rng}=window.FXK;

const BONE='#e7e2d5', INK='#16130f', COAL='#0c0c0d', NAVY='#161c28', TEXT='#eef2f8', DIM='#8b96a8', VERM='#e4471d', YEL='#ffce4a', TEAL='#29d9bb', PAPER='#d9d4c6', CHINA='#d8321f', DTEAL='#1f7f70', DYEL='#f6c544';
const MONO=s=>'bold '+s+'px "Courier Prime","Courier New",monospace';
const SANS=s=>'800 '+s+'px "Helvetica Neue",Helvetica,Arial,"Segoe UI",system-ui,sans-serif';
const mod=(t,P)=>((t%P)+P)%P;
const reset=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; };
const raw=c=>{ c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; };
const sheet=(w,h)=>{ const C=document.createElement('canvas'); C.width=w; C.height=h===undefined?w:h; return [C,C.getContext('2d')]; };
const unitSheet=N=>{ const r=sheet(N); r[1].setTransform(N/100,0,0,N/100,0,0); return r; };
/* the working plate: never more than 320 px, so a tile's frames stay small */
const work=px=>Math.max(120,Math.min(320,Math.round(px)));
const settle=p=>p<=0?0:p>=1?1:1-Math.pow(2,-8.5*p)*Math.cos(p*9.5);
const steps=(u,t0,dt,n)=>Math.min(n-1,Math.max(0,Math.floor((u-t0)/dt)));
function tab(c,x,y,txt,s,bg,fg){ c.font=MONO(s); const w=c.measureText(txt).width; c.fillStyle=bg; c.fillRect(x,y,w+s*.9,s*1.5); c.fillStyle=fg; c.textBaseline='middle'; c.textAlign='left'; c.fillText(txt,x+s*.45,y+s*.8); return w+s*.9; }
/* the box pass the alpha kernels share (innerglow, smoothedges): a window of 2r+1, every index clamped to the plate */
function boxH(a,o,W,H,r){ const inv=1/(2*r+1); for(let y=0;y<H;y++){ const row=y*W; let s=0; for(let k=-r;k<=r;k++) s+=a[row+(k<0?0:k>=W?W-1:k)]; for(let x=0;x<W;x++){ o[row+x]=s*inv; const ad=x+r+1, sb=x-r; s+=a[row+(ad>=W?W-1:ad)]-a[row+(sb<0?0:sb)]; } } }
function boxV(a,o,W,H,r){ const inv=1/(2*r+1); for(let x=0;x<W;x++){ let s=0; for(let k=-r;k<=r;k++) s+=a[(k<0?0:k>=H?H-1:k)*W+x]; for(let y=0;y<H;y++){ o[y*W+x]=s*inv; const ad=y+r+1, sb=y-r; s+=a[(ad>=H?H-1:ad)*W+x]-a[(sb<0?0:sb)*W+x]; } } }
const poly=(c,pts)=>{ c.beginPath(); pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1])); c.closePath(); };

/* ---- the subjects, all drawn here ---- */

/* a ribbon microphone in cut paper: a capsule with its grille slots cut clean through, a yoke, a stand running off the frame */
function drawMic(x){
  const cx=47, top=7, bot=64, hw=18.5, yl=cx-hw-5.6, yr=cx+hw+5.6;
  const stadium=(t0,b0,h)=>{ x.beginPath(); x.arc(cx,t0+h,h,Math.PI,0); x.lineTo(cx+h,b0-h); x.arc(cx,b0-h,h,0,Math.PI); x.closePath(); };
  x.save(); x.translate(55,48); x.rotate(-11*TAU/360); x.scale(1.08,1.08); x.translate(-47,-46);
  x.fillStyle=INK; x.strokeStyle=INK;
  stadium(top,bot,hw); x.fill();
  x.lineWidth=4; x.lineCap='butt'; x.lineJoin='miter';
  x.beginPath(); x.moveTo(yl,36); x.lineTo(yl,65); x.quadraticCurveTo(yl,78,cx,78); x.quadraticCurveTo(yr,78,yr,65); x.lineTo(yr,36); x.stroke();
  x.fillRect(yl,34.6,cx-hw-yl+1,2.8); x.fillRect(cx+hw-1,34.6,yr-cx-hw+1,2.8);
  x.beginPath(); x.arc(yl,36,4.7,0,TAU); x.fill(); x.beginPath(); x.arc(yr,36,4.7,0,TAU); x.fill();
  x.fillRect(cx-3.4,76,6.8,44); x.fillRect(cx-6.2,82,12.4,4.2);
  x.globalCompositeOperation='destination-out';
  x.save(); stadium(top+4.6,bot-4.6,hw-4.6); x.clip();
  for(const y of [12.4,18,23.6,29.2, 41.6,47.2,52.8,58.4]) x.fillRect(cx-hw,y,2*hw,2.7);
  x.restore();
  x.beginPath(); x.arc(yl,36,1.6,0,TAU); x.fill(); x.beginPath(); x.arc(yr,36,1.6,0,TAU); x.fill();
  x.restore();
}

/* a slip cut from a shooting script, on a coal bench, seen at 250 %: Courier, one chinagraph ring round the scene number */
function drawPage(x){
  x.save(); x.translate(50,50); x.rotate(-4*TAU/360); x.translate(-50,-50);
  x.fillStyle=PAPER; x.fillRect(8,23,120,52);
  x.fillStyle=INK; x.font=MONO(3.9); x.textAlign='left'; x.textBaseline='alphabetic';
  const L=[[13.2,34,'14'],[22,34,'INT. CUTTING ROOM - NIGHT'],[22,42.5,'One lamp. Reels stacked along'],[22,47.5,'the bench, each marked in red'],[22,52.5,'grease pencil.'],
    [46,61,'MARA'],[34,66,'Not that take. The one'],[34,71,'before it.']];
  x.globalAlpha=.88; for(const [a,b,s] of L) x.fillText(s,a,b); x.globalAlpha=1;
  x.strokeStyle=CHINA; x.lineWidth=.85; x.lineCap='round'; x.beginPath();
  for(let k=0;k<=46;k++){ const a=-2.2+k/40*TAU, w=1+.06*Math.sin(k*1.7); x.lineTo(15.5+Math.cos(a)*5.3*w,32.7+Math.sin(a)*4.3*w-(k>40?.6:0)); }
  x.stroke();
  x.restore();
}

/* the J, K and L keys and the row under them, flat grey cut-outs with printed legends */
const KEYC='#8d877b', LEGC='#2c2823', DESK='#121110';
function drawKeys(x){
  const rr=(a,b,w,h,r)=>{ x.beginPath(); x.moveTo(a+r,b); x.arcTo(a+w,b,a+w,b+h,r); x.arcTo(a+w,b+h,a,b+h,r); x.arcTo(a,b+h,a,b,r); x.arcTo(a,b,a+w,b,r); x.closePath(); };
  const K=[[3,6,33,'J'],[40,6,33,'K'],[77,6,33,'L'],[12,43,33,'M'],[49,43,33,'<'],[86,43,33,'>']];
  for(const [a,b,w,ch] of K){ x.fillStyle=KEYC; rr(a,b,w,w,3.8); x.fill(); x.fillStyle=LEGC; x.font=SANS(12); x.textAlign='left'; x.textBaseline='alphabetic'; x.fillText(ch,a+5,b+15); }
  x.fillStyle=KEYC; rr(-8,80,128,33,3.8); x.fill();
}

/* a keyhole matte: ink, with the hole cut through */
function drawKeyhole(x){
  x.fillStyle=INK; x.fillRect(0,0,100,100);
  x.globalCompositeOperation='destination-out';
  x.beginPath(); x.arc(40,36,15.8,0,TAU); x.fill();
  poly(x,[[35.2,42],[44.8,42],[53.2,89],[26.8,89]]); x.fill();
  x.globalCompositeOperation='source-over';
}
/* what the keyhole looks at: a lamplit wall, the bright gap of a door, the floor */
function drawRoom(x){
  x.fillStyle=DYEL; x.fillRect(0,0,100,100);
  x.fillStyle=BONE; poly(x,[[42.5,20],[49.5,20],[52,100],[41.5,100]]); x.fill();
  x.fillStyle='#c48e22'; x.fillRect(0,70,100,30);
  x.fillStyle=BONE; poly(x,[[41.5,70],[52,70],[60,100],[37,100]]); x.fill();
}

/* a tower crane in ink against a flat overcast sky, and the roofline it is building over */
const SKY='#e4e2db';
function drawCrane(x){
  x.fillStyle=SKY; x.fillRect(0,0,100,100);
  const W=INK; x.strokeStyle=W; x.fillStyle=W; x.lineCap='butt'; x.lineJoin='miter';
  const ln=(a,b,c,d,w)=>{ x.lineWidth=w; x.beginPath(); x.moveTo(a,b); x.lineTo(c,d); x.stroke(); };
  const ML=15.5, MR=23.5, TOP=21, BOT=27;
  ln(ML,104,ML,BOT,1.4); ln(MR,104,MR,BOT,1.4);
  for(let y=104;y>BOT+2;y-=8){ ln(ML,y,MR,y-4,.8); ln(MR,y-4,ML,y-8,.8); }
  ln(2.5,TOP,106,TOP,1.25); ln(MR,BOT,106,BOT,1.25); ln(2.5,BOT,ML,BOT,1.25);
  for(let a=MR;a<106;a+=6.4){ ln(a,BOT,a+3.2,TOP,.75); ln(a+3.2,TOP,a+6.4,BOT,.75); }
  for(let a=2.5;a<ML-1;a+=4.4){ ln(a,BOT,a+2.2,TOP,.75); ln(a+2.2,TOP,a+4.4,BOT,.75); }
  ln(2.5,TOP,2.5,BOT,1.1);
  ln(ML,TOP,19.5,5.5,1.2); ln(MR,TOP,19.5,5.5,1.2); ln(ML+1.2,15.5,MR-1.2,15.5,.7);
  ln(19.5,5.5,67,TOP,.55); ln(19.5,5.5,3,TOP,.55);
  x.fillRect(3.2,BOT,8.8,9.5); x.fillStyle=SKY; x.fillRect(3.2,30.4,8.8,.9); x.fillRect(3.2,33.4,8.8,.9);
  x.fillStyle=W; x.fillRect(MR,BOT,6.2,5.8); x.fillStyle=SKY; x.fillRect(MR+1.3,BOT+1.3,3.8,2.6);
  x.fillStyle=W; x.fillRect(70.5,BOT,6.4,2.3);
  ln(72,BOT+2.3,72,62,.5); ln(75.4,BOT+2.3,75.4,62,.5);
  x.fillRect(70.6,62,6.2,5.2);
  x.lineWidth=1; x.beginPath(); x.arc(73.7,70.6,2.3,-.2,Math.PI*1.15); x.stroke(); ln(73.7,67.2,73.7,68.4,1);
  /* the roofline, with the floor going up under the hook */
  poly(x,[[28,101],[28,90],[41,90],[41,86.5],[55,86.5],[55,92],[63,92],[63,83],[66,83],[66,80.5],[84,80.5],[84,83],[86,83],[86,89],[101,89],[101,101]]); x.fill();
  x.fillStyle=SKY; for(let i=0;i<5;i++) x.fillRect(67.5+i*3.3,84.5,1.6,5.5);
  x.fillStyle=W; ln(66,80.5,66,74,.6); ln(84,80.5,84,74,.6); ln(66,74,84,74,.6); ln(66,77.3,84,77.3,.45);
}

window.FX_TILES.push(

/* GLOW INWARD. Cut paper: a ribbon microphone cut from ink, its grille slots cut clean through, on vermilion. PIXEL_FX.innerglow on a
   1080 frame, ported: the layer's alpha as a 0/1 mask, one box pass of Radius each way, glow = (1 - blur) x 1.6 x Intensity, screened
   in the default #ffe08a, only where the layer is. Radius steps to 20 at Intensity 1.3; then Distance steps to 30 at Angle 135, which
   moves the measuring copy down and left so the glow deepens on the upper-right edges and leaves the others. */
{ id:'innerglow', name:'Glow Inward', section:'Drawing / Edge', isNew:true, still:3.3,
  line:'A warm glow runs just inside the edges of a cut-out layer, and Distance pushes it over to one side.',
  make(px){
    const P=4.8, N=work(px), ps=N/1080, n=N*N;
    const [L,lx]=unitSheet(N); drawMic(lx);
    const im=lx.getImageData(0,0,N,N), s=im.data, A=new Uint8Array(n);   /* the one read */
    for(let i=0;i<n;i++) A[i]=s[i*4+3]>0?1:0;
    const GC=[255,224,138], mask=new Float32Array(n), tmp=new Float32Array(n), soft=new Float32Array(n);
    const [LC,lc]=sheet(N), o=lc.createImageData(N,N), od=o.data;
    const frame=(R,I,D,ang)=>{ const [C,x]=sheet(N); x.fillStyle=VERM; x.fillRect(0,0,N,N);
      if(!(I>0)){ x.drawImage(L,0,0); return C; }
      const rr=Math.max(1,Math.min(30,Math.round(R*ps))), dd=Math.min(60,D*ps), a=ang*TAU/360, ox=dd>0?Math.round(Math.cos(a)*dd):0, oy=dd>0?Math.round(Math.sin(a)*dd):0;
      for(let y=0;y<N;y++){ let sy=y-oy; sy=sy<0?0:sy>N-1?N-1:sy; for(let xx=0;xx<N;xx++){ let sx=xx-ox; sx=sx<0?0:sx>N-1?N-1:sx; mask[y*N+xx]=A[sy*N+sx]; } }
      boxH(mask,tmp,N,N,rr); boxV(tmp,soft,N,N,rr);
      od.set(s);
      for(let i=0;i<n;i++){ const j=i*4; if(s[j+3]<=0) continue; let p=(1-soft[i])*1.6; p=p<0?0:p>1?1:p; let f=p*I; if(f<=0) continue; if(f>1) f=1;
        od[j]=255-(255-s[j])*(255-GC[0]*f)/255; od[j+1]=255-(255-s[j+1])*(255-GC[1]*f)/255; od[j+2]=255-(255-s[j+2])*(255-GC[2]*f)/255; }
      lc.putImageData(o,0,0); x.drawImage(LC,0,0); return C; };
    const FR=[frame(0,0,0,135)];
    [5,10,15,20].forEach(r=>FR.push(frame(r,1.3,0,135)));
    [6,12,18,24,30].forEach(d=>FR.push(frame(20,1.3,d,135)));
    [.85,.5,.2].forEach(i=>FR.push(frame(20,i,30,135)));
    const pick=u=>u<.5?0 : u<1.0?1+steps(u,.5,.125,4) : u<2.3?4 : u<2.8?5+steps(u,2.3,.1,5) : u<4.0?9 : u<4.36?10+steps(u,4.0,.12,3) : 0;
    return (c,t)=>{ raw(c); c.drawImage(FR[pick(mod(t,P))],0,0,px,px); };
  } },

/* TORN EDGE. A slip cut from a shooting script, on a coal bench, in a 250 % viewer (100 units = 432 project px). PIXEL_FX.roughenedges
   ported call for call: two value-noise channels on the kernel's own integer hash, Scale 12 px, every alpha read pushed sideways by up to
   Amount, whole pixels. Amount steps to 14, Complexity cuts 1, 2, 3, then Boil 1.5 walks the noise. Only the outline moves; a pixel it
   pushes outward keeps the plate's empty colour, which is black, so on this coal the tear reads as bites. */
{ id:'roughenedges', name:'Torn Edge', section:'Drawing / Edge', isNew:true, still:3.0,
  line:'The outline of the layer is pushed in and out by noise, so a clean cut edge goes ragged, and Boil makes it crawl.',
  make(px){
    const P=4.6, N=work(px), F=432, ps=N/F, n=N*N, OFF=Math.round((1080-F)/2*ps);
    const [L,lx]=unitSheet(N); drawPage(lx);
    const s=lx.getImageData(0,0,N,N).data, A0=new Uint8Array(n);   /* the one read */
    for(let i=0;i<n;i++) A0[i]=s[i*4+3];
    const AMAX=14, scl=12*ps, inv=1/scl, RB=Math.ceil(AMAX*ps)+2;
    /* only pixels this close to the outline can read a different alpha */
    const b=new Float32Array(n), t1=new Float32Array(n), t2=new Float32Array(n); for(let i=0;i<n;i++) b[i]=A0[i]>0?1:0;
    boxH(b,t1,N,N,RB); boxV(t1,t2,N,N,RB);
    const band=[]; for(let i=0;i<n;i++) if(t2[i]>1e-5&&t2[i]<1-1e-5) band.push(i);
    const hsh=(ix,iy,sd)=>{ let h=(ix*374761393+iy*668265263+sd*2147483647)|0; h=(h^(h>>>13))*1274126177|0; h=(h^(h>>>16))>>>0; return h/4294967295; };
    const nz=(fx,fy,sd)=>{ const x0=Math.floor(fx), y0=Math.floor(fy), tx=fx-x0, ty=fy-y0, ux=tx*tx*(3-2*tx), uy=ty*ty*(3-2*ty);
      const n00=hsh(x0,y0,sd), n10=hsh(x0+1,y0,sd), n01=hsh(x0,y0+1,sd), n11=hsh(x0+1,y0+1,sd), a=n00+(n10-n00)*ux, bb=n01+(n11-n01)*ux; return a+(bb-a)*uy; };
    const field=(fx,fy,sd,C,z,zi,zf)=>{ if(C===1&&z===0) return nz(fx,fy,sd); let sum=.5,w=1,f=1;
      for(let k=0;k<C;k++){ const so=sd+k*7; let v=nz(fx*f,fy*f,so+zi*1009); if(z!==0) v+=(nz(fx*f,fy*f,so+(zi+1)*1009)-v)*zf; sum+=(v-.5)*w; w*=.6; f*=2; }
      return sum<0?0:sum>1?1:sum; };
    const SX0=11, SY0=29;   /* Pattern 0 */
    const [LC,lc]=sheet(N), o=lc.createImageData(N,N), od=o.data;
    const frame=(amt,C,z)=>{ const [Cv,x]=sheet(N); x.fillStyle=COAL; x.fillRect(0,0,N,N); od.set(s);
      const am=amt*ps;
      if(am>0){ const zi=Math.floor(z); let zf=z-zi; zf=zf*zf*(3-2*zf);
        for(let q=0;q<band.length;q++){ const i=band[q], yy=(i/N)|0, xx=i-yy*N, fx=(xx+OFF)*inv, fy=(yy+OFF)*inv;
          const dx=(field(fx,fy,SX0,C,z,zi,zf)*2-1)*am, dy=(field(fx,fy,SY0,C,z,zi,zf)*2-1)*am;
          let sx=xx+(dx|0), sy=yy+(dy|0); sx=sx<0?0:sx>=N?N-1:sx; sy=sy<0?0:sy>=N?N-1:sy; od[i*4+3]=A0[sy*N+sx]; } }
      lc.putImageData(o,0,0); x.drawImage(LC,0,0); return Cv; };
    const FR=[frame(0,1,0)];
    [4,8,11,14].forEach(a=>FR.push(frame(a,1,0)));          /* 1..4 */
    FR.push(frame(14,2,0)); FR.push(frame(14,3,0));        /* 5, 6 */
    for(let k=1;k<=14;k++) FR.push(frame(14,3,1.5*k/12));  /* 7..20: Boil 1.5 at 12 fps */
    [9,4].forEach(a=>FR.push(frame(a,3,1.5*14/12)));        /* 21, 22 */
    const pick=u=>u<.6?0 : u<1.1?1+steps(u,.6,.125,4) : u<2.0?4 : u<2.35?5 : u<2.7?6 : u<3.9?7+steps(u,2.7,1/12,14) : u<4.1?20 : u<4.36?21+steps(u,4.1,.13,2) : 0;
    return (c,t)=>{ raw(c); c.drawImage(FR[pick(mod(t,P))],0,0,px,px); reset(c,px); tab(c,2.5,2.5,'250%',3.8,NAVY,DIM); };
  } },

/* RAISED EDGE. Viewer overlay at 200 % (100 units = 540 project px): six keys and the spacebar, flat grey cut-outs on one layer, over a
   dark desk layer. PIXEL_FX.smoothbevel ported: the alpha as 0/1, one box pass of Depth 12 project px each way, band 4s(1 - s), the
   blur's slope dotted with the light, x Strength x 765, only inside the layer. Strength steps to 1.5 with Light from at 135 (upper
   left), then Light from turns a full circle in four quarter moves. Under the picture, Light from's own keyframe lane and the playhead. */
{ id:'smoothbevel', name:'Raised Edge', section:'Drawing / Edge', isNew:true, still:1.2,
  line:'The edges of a flat cut-out shade light on one side and dark on the other so it looks pressed up, and Light from turns the shading round.',
  make(px){
    const P=4.9, N=work(px), F=540, ps=N/F, n=N*N, PH=86;
    const [L,lx]=unitSheet(N); drawKeys(lx);
    const s=lx.getImageData(0,0,N,N).data, mk=new Float32Array(n);   /* the one read */
    for(let i=0;i<n;i++) mk[i]=s[i*4+3]>0?1:0;
    const dep=Math.max(1,Math.min(20,Math.round(12))), plate=dep*ps, r=Math.floor(plate), fr=plate-r, inv=1/(plate*2+1), tmp=new Float32Array(n), soft=new Float32Array(n);
    for(let y=0;y<N;y++){ const ro=y*N; let acc=mk[ro]*(r+1); for(let k=1;k<=r;k++) acc+=mk[ro+Math.min(k,N-1)];
      for(let x=0;x<N;x++){ let h=acc*inv; if(fr){ const hl=Math.max(0,x-r-1), hr=Math.min(N-1,x+r+1); h+=fr*(mk[ro+hl]+mk[ro+hr])*inv; } tmp[ro+x]=h;
        let a=x-r; if(a<0) a=0; let b=x+r+1; if(b>N-1) b=N-1; acc+=mk[ro+b]-mk[ro+a]; } }
    for(let x=0;x<N;x++){ let acc=tmp[x]*(r+1); for(let k=1;k<=r;k++) acc+=tmp[Math.min(k,N-1)*N+x];
      for(let y=0;y<N;y++){ let v=acc*inv; if(fr){ const vt=Math.max(0,y-r-1), vb=Math.min(N-1,y+r+1); v+=fr*(tmp[vt*N+x]+tmp[vb*N+x])*inv; } soft[y*N+x]=v;
        let a=y-r; if(a<0) a=0; let b=y+r+1; if(b>N-1) b=N-1; acc+=tmp[b*N+x]-tmp[a*N+x]; } }
    const idx=[], GX=[], GY=[];
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){ const i=y*N+x; if(s[i*4+3]<=0) continue; const sv=soft[i]; let bd=4*sv*(1-sv); if(bd<=0) continue; if(bd>1) bd=1;
      const xm=x>0?x-1:0, xp=x<N-1?x+1:N-1, ym=y>0?y-1:0, yp=y<N-1?y+1:N-1;
      idx.push(i); GX.push((soft[y*N+xp]-soft[y*N+xm])*bd*765); GY.push((soft[yp*N+x]-soft[ym*N+x])*bd*765); }
    const [LC,lc]=sheet(N), o=lc.createImageData(N,N), od=o.data;
    const frame=(ang,str)=>{ const [C,x]=sheet(N); x.fillStyle=DESK; x.fillRect(0,0,N,N); od.set(s);
      if(str>0){ let lxv=-.7071, lyv=-.7071; const am=((ang%360)+360)%360; if(am!==315){ lxv=-Math.cos(am*TAU/360); lyv=Math.sin(am*TAU/360); }
        for(let k=0;k<idx.length;k++){ const j=idx[k]*4, term=(GX[k]*lxv+GY[k]*lyv)*str; od[j]=s[j]+term; od[j+1]=s[j+1]+term; od[j+2]=s[j+2]+term; } }
      lc.putImageData(o,0,0); x.drawImage(LC,0,0); return C; };
    const FLAT=frame(135,0), RAMP=[.5,1,1.5].map(v=>frame(135,v)), TURN=[]; for(let k=0;k<16;k++) TURN.push(frame(135+k*22.5,1.5));
    /* Light from: 135, then four quarter turns, 4 steps each on threes, half a second held between */
    const T0=[1.4,2.2,3.0,3.8];
    const lightAt=u=>{ let a=135; for(let q=0;q<4;q++){ if(u<T0[q]) return a; const k=Math.min(4,Math.floor((u-T0[q])/.09)+1); if(k<4) return a+k*22.5; a+=90; } return a; };
    /* the Light from lane: one keyframe at each end of each quarter turn, the playhead running through them */
    const TX0=47, TX1=96.5, TY=93.2, xOf=u=>TX0+(TX1-TX0)*u/P, KF=[T0[0]]; T0.forEach(q=>KF.push(q+.36)); for(let q=1;q<4;q++) KF.push(T0[q]);
    return (c,t)=>{ const u=mod(t,P); raw(c);
      const flat=u<.4||u>=4.55, ang=lightAt(u), str=flat?0:u<.7?[.5,1,1.5][steps(u,.4,.1,3)]:1.5;
      const F0=flat?FLAT:str<1.5?RAMP[[.5,1].indexOf(str)]:TURN[Math.round((((ang-135)%360)+360)%360/22.5)%16];
      c.drawImage(F0,0,0,N,N*PH/100,0,0,px,px*PH/100);
      reset(c,px);
      c.fillStyle=NAVY; c.fillRect(0,PH,100,100-PH);
      const shown=Math.round(((ang%360)+360)%360);
      c.font=MONO(5); c.textAlign='left'; c.textBaseline='middle'; c.fillStyle=flat?DIM:TEXT; c.fillText('LIGHT '+String(shown).padStart(3,'0')+'°',3.5,TY);
      c.strokeStyle=DIM; c.lineWidth=.5; c.beginPath(); c.moveTo(TX0,TY); c.lineTo(TX1,TY); c.stroke();
      c.fillStyle=YEL; for(const k of KF){ const X=xOf(k); c.beginPath(); c.moveTo(X,TY-1.5); c.lineTo(X+1.5,TY); c.lineTo(X,TY+1.5); c.lineTo(X-1.5,TY); c.closePath(); c.fill(); }
      const HX=xOf(u); c.fillStyle=TEAL; c.fillRect(HX-.3,PH+1.6,.6,11); c.fillRect(HX-1.1,PH+1.2,2.2,2.2);
    };
  } },

/* SOFT OUTLINE. Comp sheets: the MATTE layer (ink, a keyhole cut through it) over the plate (a lamplit room, a bright door gap).
   PIXEL_FX.smoothedges on the matte, 1080 frame, ported: one box blur of the alpha by Softness, Falloff Smooth runs it a second time,
   Choke remaps round half alpha. Softness steps to 16, Falloff cuts to Smooth, then Choke -35 pulls the matte back and the hole opens. */
{ id:'smoothedges', name:'Soft Outline', section:'Drawing / Edge', isNew:true, still:2.4,
  line:'The hard outline of a layer is feathered into a soft edge, and Choke moves that soft edge in or out.',
  make(px){
    const P=4.8, N=work(px), ps=N/1080, n=N*N;
    const [M,mx]=unitSheet(N); drawKeyhole(mx);
    const s=mx.getImageData(0,0,N,N).data, A=new Float32Array(n);   /* the one read */
    for(let i=0;i<n;i++) A[i]=s[i*4+3];
    const [PL,pl]=unitSheet(N); drawRoom(pl);
    const tmp=new Float32Array(n), b1=new Float32Array(n), b2=new Float32Array(n);
    const [LC,lc]=sheet(N), o=lc.createImageData(N,N), od=o.data;
    const frame=(R,smooth,ch)=>{ const [C,x]=sheet(N); x.drawImage(PL,0,0); od.set(s);
      const r=Math.min(20,Math.round(R*ps));
      if(r>=1){ boxH(A,tmp,N,N,r); boxV(tmp,b1,N,N,r); let a=b1; if(smooth){ boxH(b1,tmp,N,N,r); boxV(tmp,b2,N,N,r); a=b2; }
        const k=ch/100; for(let i=0;i<n;i++){ let v=a[i]; if(k!==0){ v=(v-127.5)*(1+Math.abs(k)*3)+127.5+k*127.5; } od[i*4+3]=v; } }
      lc.putImageData(o,0,0); x.drawImage(LC,0,0); return C; };
    const ST=[[0,0,0,'SOFT 0']];
    [4,8,12,16].forEach(v=>ST.push([v,0,0,'SOFT '+v]));        /* 1..4 */
    ST.push([16,1,0,'SMOOTH']);                                 /* 5 */
    [-12,-24,-35].forEach(v=>ST.push([16,1,v,'CHOKE '+v]));     /* 6..8 */
    ST.push([16,1,-18,'CHOKE -18'],[10,1,0,'SOFT 10'],[4,0,0,'SOFT 4']);   /* 9..11 */
    const FR=ST.map(q=>frame(q[0],q[1],q[2]));
    const pick=u=>u<.6?0 : u<1.1?1+steps(u,.6,.125,4) : u<1.9?4 : u<2.7?5 : u<3.1?6+steps(u,2.7,.13,3) : u<4.0?8 : u<4.4?9+steps(u,4.0,.13,3) : 0;
    return (c,t)=>{ const k=pick(mod(t,P)); raw(c); c.drawImage(FR[k],0,0,px,px); reset(c,px);
      tab(c,3,3,'MATTE',4.2,BONE,INK); tab(c,3,92,ST[k][3],4.2,INK,k?BONE:DIM); };
  } },

/* BEND. Cut paper: a railway track from above, one layer, on an ink ground. WARP_FX.bend on a 1080 frame, Bows Left / right: every row of
   the layer moves sideways by Amount x half the frame x sin(pi f), f remapped so the bow peaks at Peak at, and the top and bottom rows
   never move. Amount settles on 0.5 (the default), then Peak at slides 50 to 28 to 72. Drawn as vectors, each point moved by its own row. */
{ id:'bend', name:'Bend', section:'Warping', isNew:true, still:2.8,
  line:'The layer bows sideways into one smooth arc with its top and bottom held still, and Peak at slides the deepest point along it.',
  make(px){
    const P=4.8, T=-5*TAU/360, cT=Math.cos(T), sT=Math.sin(T), X0=44, Y0=50;
    const rot=(x,y)=>[X0+(x-X0)*cT-(y-Y0)*sT, Y0+(x-X0)*sT+(y-Y0)*cT];
    const sh=(y,amt,pos)=>{ const u=clamp(y/100,0,1); let f=u; if(pos!==50){ const bp=clamp(pos/100,.0001,.9999); f=u<bp?(u/bp)*.5:.5+((u-bp)/(1-bp))*.5; } return amt*50*Math.sin(f*Math.PI); };
    const RAILS=[-9.6,9.6], RW=1.35, SLH=1.75, SLW=17;
    const SLEEP=[]; for(let y=-10;y<=110;y+=8.2) SLEEP.push(y);
    const state=f=>{
      if(f<.5) return [0,50];
      if(f<1.4) return [.5*settle(seg(f,.5,1.4)),50];
      if(f<2.0) return [.5,50];
      if(f<2.5) return [.5,lerp(50,28,E.inOut(seg(f,2.0,2.5)))];
      if(f<2.95) return [.5,28];
      if(f<3.6) return [.5,lerp(28,72,E.inOut(seg(f,2.95,3.6)))];
      if(f<4.0) return [.5,72];
      if(f<4.55){ const q=E.inOut(seg(f,4.0,4.55)); return [.5*(1-q),lerp(72,50,q)]; }
      return [0,50]; };
    return (c,t)=>{ const f=Math.floor(mod(t,P)*12)/12, [amt,pos]=state(f); reset(c,px);
      const mv=p=>[p[0]+sh(p[1],amt,pos),p[1]];
      c.fillStyle=INK; c.fillRect(0,0,100,100);
      c.fillStyle=BONE;
      for(const y of SLEEP){ const q=[[X0-SLW,y-SLH],[X0+SLW,y-SLH],[X0+SLW,y+SLH],[X0-SLW,y+SLH]].map(p=>mv(rot(p[0],p[1]))); poly(c,q); c.fill(); }
      c.fillStyle=YEL;
      for(const o of RAILS){ const Lp=[], Rp=[]; for(let y=-12;y<=112;y+=2){ Lp.push(mv(rot(X0+o-RW,y))); Rp.push(mv(rot(X0+o+RW,y))); } poly(c,Lp.concat(Rp.reverse())); c.fill(); }
    };
  } },

/* PINCH / BULGE. Two-ink print: a clay court seen from the umpire's camera, straight down. The vermilion plate is the clay with the
   lines knocked out to paper, the ink plate the net, its shadow and the ball marks, 0.7 out of register. WARP_FX.bulge on a 1080 frame,
   ported: inside a lens of Radius 62 % of the half-diagonal centred at 52 / 56, each pixel reads the court at r^(1 + Amount) of its
   distance (read bilinearly, as the GPU path does); outside the lens nothing moves. Amount -0.5 (the default) pulls everything in toward
   the centre, then +0.8 swells it out. Measured beside the real render on his ramp and towers: same direction, same reach. */
{ id:'bulge', name:'Pinch / Bulge', section:'Warping', isNew:true, still:3.1,
  line:'Inside a round lens the picture is pulled in toward the middle or pushed out from it, depending on the sign of Amount.',
  make(px){
    const P=4.8, N=work(px), S2=2*N, f2=S2/N, OFX=.7, OFY=-.45;
    /* the court: two plates multiplied onto bone, drawn in units at twice the working size, then read once */
    const [S,sx]=unitSheet(S2), [VP,vp]=unitSheet(S2), [IP,ip]=unitSheet(S2);
    const LW=1.7, SL=7, SR=81, CL=44, SV1=6, SV2=82, NT=40.5;
    vp.fillStyle=VERM; vp.fillRect(0,0,100,100); vp.globalCompositeOperation='destination-out'; vp.fillStyle='#000';
    vp.fillRect(SL-LW/2,-2,LW,104); vp.fillRect(SR-LW/2,-2,LW,104); vp.fillRect(SL,SV1-LW/2,SR-SL,LW); vp.fillRect(SL,SV2-LW/2,SR-SL,LW);
    vp.fillRect(CL-LW/2,SV1,LW,SV2-SV1); vp.fillRect(97-LW/2,-2,LW,104); vp.fillRect(-2,NT-1.6,104,1.6);
    const R=rng(5521); for(let i=0;i<60;i++){ vp.beginPath(); vp.arc(R()*100,R()*100,.16+R()*.2,0,TAU); vp.fill(); }
    ip.translate(OFX,OFY); ip.fillStyle=INK; ip.fillRect(-2,NT,104,3.4);
    ip.globalAlpha=.22; poly(ip,[[-2,NT+3.4],[104,NT+3.4],[104,NT+8.5],[-2,NT+7.2]]); ip.fill();
    for(const [a,b,w,h] of [[61,25,3.4,1.9],[27,63,3.2,1.8],[67,70,3.6,2],[20,18,3,1.7],[57,90,3.2,1.8]]){ ip.beginPath(); ip.ellipse(a,b,w/2,h/2,.35,0,TAU); ip.fill(); }
    ip.globalAlpha=1; for(let i=0;i<90;i++){ ip.beginPath(); ip.arc(R()*100,R()*100,.12+R()*.16,0,TAU); ip.fill(); }
    sx.fillStyle=BONE; sx.fillRect(0,0,100,100); sx.globalCompositeOperation='multiply'; sx.drawImage(VP,0,0,100,100); sx.drawImage(IP,0,0,100,100); sx.globalCompositeOperation='source-over';
    const s=sx.getImageData(0,0,S2,S2).data;   /* the one read */
    const CX=N*.52, CY=N*.56, MR=Math.hypot(N/2,N/2)*.62;
    /* the kernel's map in plate px, then a bilinear read of the double-size mat (the app's GPU path filters linearly) */
    const frame=k=>{ const [C,x]=sheet(N), o=x.createImageData(N,N), d=o.data, M=S2-1;
      for(let y=0;y<N;y++) for(let xx=0;xx<N;xx++){ const j=(y*N+xx)*4; let qx=xx+.5, qy=y+.5;
        const nx=(qx-CX)/MR, ny=(qy-CY)/MR, r=Math.hypot(nx,ny);
        if(r<1&&k!==0){ const sc=r<1e-4?1:Math.pow(r,1+k)/r; qx=CX+nx*sc*MR; qy=CY+ny*sc*MR; }
        let fx=qx*f2-.5, fy=qy*f2-.5; fx=fx<0?0:fx>M?M:fx; fy=fy<0?0:fy>M?M:fy;
        const ix=Math.min(M-1,fx|0), iy=Math.min(M-1,fy|0), ax=fx-ix, ay=fy-iy, g=(iy*S2+ix)*4, g2=g+S2*4;
        for(let ch=0;ch<3;ch++) d[j+ch]=(s[g+ch]*(1-ax)+s[g+4+ch]*ax)*(1-ay)+(s[g2+ch]*(1-ax)+s[g2+4+ch]*ax)*ay;
        d[j+3]=255; }
      x.putImageData(o,0,0); return C; };
    const KS=[]; for(let k=-5;k<=8;k++) KS.push(k/10);
    const FR=new Map(KS.map(k=>[k,frame(k)]));
    const amountAt=f=>f<.5?0 : f<1.1?-.5*E.inOut(seg(f,.5,1.1)) : f<2.0?-.5 : f<2.6?lerp(-.5,.8,E.inOut(seg(f,2.0,2.6))) : f<3.9?.8 : f<4.4?.8*(1-E.inOut(seg(f,3.9,4.4))) : 0;
    return (c,t)=>{ const f=Math.floor(mod(t,P)*12)/12, k=Math.round(amountAt(f)*10)/10, kk=Object.is(k,-0)?0:k; raw(c);
      c.drawImage(FR.get(kk),0,0,px,px); reset(c,px);
      tab(c,3,91.5,'AMOUNT '+(kk<0?'−':kk>0?'+':' ')+Math.abs(kk).toFixed(2),4.2,INK,BONE); };
  } },

/* CHROMATIC ABERRATION. Viewer overlay: a tower crane in ink against a flat overcast sky, drawn here. PIXEL_FX.chromaticaberration on
   a 1080 frame, ported, Toward edges 100 (the default) and Fringes Green / pink: green is read Amount x r/R further out, red and blue
   as far in, all rounded to whole pixels, so nothing moves at the centre and dark lines gain a green edge outside and a magenta one
   inside. (Red / blue, the default, splits dark-on-light into yellow and cyan, which all but vanishes on a pale sky.) Amount steps to
   20, then Centre X / Y travel to 34 / 64, the teal anchor: the clean spot follows it and the far corner fringes most. */
{ id:'chromaticaberration', name:'Chromatic Aberration', section:'Warping', isNew:true, still:3.0,
  line:'The colour channels drift apart toward the edges of the frame while the centre stays clean, so hard edges grow coloured fringes.',
  make(px){
    const P=4.6, N=work(px), ps=N/1080, n=N*N;
    const [S,sx]=unitSheet(N); drawCrane(sx);
    const s=sx.getImageData(0,0,N,N).data;   /* the one read */
    const frame=(amt,cxp,cyp)=>{ const [C,x]=sheet(N), o=x.createImageData(N,N), d=o.data, a=amt*ps;
      if(a===0){ d.set(s); x.putImageData(o,0,0); return C; }
      const W=N, H=N, Cx=cxp===50?W/2:W*cxp/100, Cy=cyp===50?H/2:H*cyp/100, norm=1/Math.max(1,(Cx===W/2&&Cy===H/2)?Math.hypot(Cx,Cy):Math.hypot(Math.max(Cx,W-Cx),Math.max(Cy,H-Cy)));
      for(let y=0;y<H;y++) for(let xx=0;xx<W;xx++){ const j=(y*W+xx)*4, qx=xx-Cx, qy=y-Cy, r=Math.hypot(qx,qy), m=a*r*norm, ux=r>0?qx/r:0, uy=r>0?qy/r:0, dx=ux*m, dy=uy*m;
        let rx=Math.round(xx+dx), ry=Math.round(y+dy), bx=Math.round(xx-dx), by=Math.round(y-dy);
        rx=rx<0?0:rx>=W?W-1:rx; ry=ry<0?0:ry>=H?H-1:ry; bx=bx<0?0:bx>=W?W-1:bx; by=by<0?0:by>=H?H-1:by;
        const ri=(ry*W+rx)*4, bi=(by*W+bx)*4;
        d[j]=s[bi]; d[j+1]=s[ri+1]; d[j+2]=s[bi+2]; d[j+3]=s[j+3]; }   /* Fringes 1, Green / pink: d[R]=S[Bi], d[G]=S[Ri+1], d[B]=S[Bi+2] */
      x.putImageData(o,0,0); return C; };
    const ST=[[0,50,50]];
    [5,10,15,20].forEach(v=>ST.push([v,50,50]));                                   /* 1..4 */
    for(let k=1;k<=7;k++){ const q=E.inOut(k/7); ST.push([20,Math.round(lerp(50,34,q)),Math.round(lerp(50,64,q))]); }   /* 5..11 */
    [[14,40,59],[8,46,54],[3,49,51]].forEach(v=>ST.push(v));                       /* 12..14 */
    const FR=ST.map(q=>frame(q[0],q[1],q[2]));
    const pick=u=>u<.5?0 : u<.9?1+steps(u,.5,.1,4) : u<2.0?4 : u<2.6?5+steps(u,2.0,1/12,7) : u<3.8?11 : u<4.2?12+steps(u,3.8,.13,3) : 0;
    return (c,t)=>{ const k=pick(mod(t,P)), st=ST[k]; raw(c); c.drawImage(FR[k],0,0,px,px); reset(c,px);
      if(st[0]>0){ const ax=st[1], ay=st[2]; c.fillStyle=NAVY; c.fillRect(ax-1.9,ay-1.9,3.8,3.8); c.fillStyle=TEAL; c.fillRect(ax-1.3,ay-1.3,2.6,2.6); c.fillStyle=NAVY; c.fillRect(ax-.45,ay-.45,.9,.9); }
      tab(c,3,92,'AMOUNT '+String(st[0]).padStart(2,'0'),4.2,NAVY,st[0]?TEXT:DIM); };
  } }

);
})();
