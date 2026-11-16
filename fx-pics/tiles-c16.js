/* FreeMotion effect pictures, artist 16 (c16): seven Warping tiles. No photographs: every subject is drawn here, and every change
   on it is the effect's own maths from js/compositor.js, run on those pixels. */
(function(){ 'use strict';
const {TAU,clamp,lerp,seg,E,rng,hash,vnoise,canvasOf}=window.FXK;

const BONE='#e7e2d5', INK='#16130f', NAVY='#161c28', TEXT='#eef2f8', DIM='#8b96a8', VERM='#e4471d', YEL='#ffce4a', TEAL='#29d9bb';
const RTEAL='#1f7f70', RYEL='#f6c544', SILVER='#c9ccd2';
const MONO=s=>'bold '+s+'px "Courier Prime","Courier New",monospace';
const SANS=s=>'800 '+s+'px "Helvetica Neue",Helvetica,Arial,"Segoe UI",system-ui,sans-serif';
const mod=(t,P)=>((t%P)+P)%P;
/* every frame starts from a known state: 0..100 units, or raw pixels */
const unit=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; c.imageSmoothingEnabled=true; c.setLineDash([]); };
const raw=c=>{ c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; c.imageSmoothingEnabled=true; };
const blank=(w,h)=>{ const C=document.createElement('canvas'); C.width=w; C.height=h===undefined?w:h; return [C,C.getContext('2d')]; };
const poly=(c,p,fill)=>{ c.fillStyle=fill; c.beginPath(); p.forEach((q,i)=>i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1])); c.closePath(); c.fill(); };
const disc=(c,x,y,r,fill)=>{ c.fillStyle=fill; c.beginPath(); c.arc(x,y,r,0,TAU); c.fill(); };
const smooth=p=>{ p=clamp(p); return p*p*(3-2*p); };
const settle=p=>p<=0?0:p>=1?1:1-Math.pow(2,-8.5*p)*Math.cos(p*9.5);
function tab(c,x,y,txt,s,bg,fg){ c.font=MONO(s); const w=c.measureText(txt).width; c.fillStyle=bg; c.fillRect(x,y,w+s*.9,s*1.5); c.fillStyle=fg; c.textBaseline='middle'; c.textAlign='left'; c.fillText(txt,x+s*.45,y+s*.8); return w+s*.9; }
/* the source picture's pixels: drawn in 0..100 units on an n px canvas, read once */
function pixelsOf(n,paint){ const [C,x]=canvasOf(n); paint(x,n); return {C,data:x.getImageData(0,0,n,n).data}; }

/* ---------------------------------------------------------------------------------------------------------------------- */
/* MIRROR. Cut paper: one bone profile, scissor cut, on an ink ground, a vermilion eye. drawMirror, Direction Left -> Right, Repeat
   folds On, Angle 0: the kept strip [0, seam] and its reflection [seam, 2 x seam]. Seam is keyed 100 % (the layer passes through)
   to 50 %, so the second face slides in and meets the first nose to nose; the ink left between them is a vase. The vermilion
   marks at the frame's edges are the seam. Stepped on twos. */
const HEAD=[[-2,-2],[27.5,-2],[31.8,6],[34.6,15.5],[37.0,22.4],[35.4,26.0],[38.2,31.0],[45.4,41.2],[43.6,44.0],[39.6,45.2],[41.2,49.4],
  [38.6,51.6],[40.4,54.6],[37.2,58.2],[39.6,64.6],[35.8,69.8],[30.6,72.2],[30.2,86.0],[34.5,102],[-2,102]];
const EYE=[[29.0,27.6],[33.6,26.3],[32.9,28.9],[30.0,29.4]];
function paintProfile(s){
  s.fillStyle=INK; s.fillRect(0,0,100,100);
  poly(s,HEAD,BONE);
  poly(s,EYE,VERM);   /* the eye: a vermilion piece laid into the cut */
}

/* PIXELATE. Graded still: a blood orange cut in half on slate, drawn here. drawPixelate's own two steps: the frame drawn down to
   round(1080 / Block size) cells with smoothing, then back up with smoothing off. Block size steps 1, 12, 24, 48 px of a 1080
   frame on hard cuts and holds at 48; the tab reads the slider. */
/* (art director, ad) Pixelate's subject: a green road sign on its two posts against a sky and a tree line. The halved blood orange
   it showed first repeated Grayscale's citrus slices. A sign is also what pixelation is really used to hide: its words go first. */
function paintSign(s){
  const r=rng(5150);
  const sky=s.createLinearGradient(0,0,0,76); sky.addColorStop(0,'#4f80b8'); sky.addColorStop(1,'#bcd5e8'); s.fillStyle=sky; s.fillRect(0,0,100,100);
  for(let i=0;i<9;i++){ const cx=r()*110-5, cy=4+r()*26, w=10+r()*16; s.fillStyle='rgba(255,255,255,'+(.35+r()*.3).toFixed(2)+')';
    for(let k=0;k<5;k++){ s.beginPath(); s.ellipse(cx+(k-2)*w*.22,cy+(r()-.5)*2,w*.2+r()*3,2.2+r()*1.6,0,0,TAU); s.fill(); } }
  /* the tree line and the verge */
  s.fillStyle='#2f4a26'; s.beginPath(); s.moveTo(0,100); s.lineTo(0,78); for(let x=0;x<=100;x+=2.5) s.lineTo(x,73+Math.sin(x*.37)*1.6+r()*3.2); s.lineTo(100,100); s.closePath(); s.fill();
  for(let i=0;i<500;i++){ s.fillStyle=r()<.5?'rgba(120,150,70,.35)':'rgba(10,25,10,.35)'; s.fillRect(r()*100,74+r()*14,.5+r()*.8,.5+r()*.8); }
  s.fillStyle='#6f8a3a'; s.fillRect(0,88,100,12); for(let i=0;i<300;i++){ s.fillStyle=r()<.5?'rgba(160,180,90,.4)':'rgba(40,60,20,.35)'; s.fillRect(r()*100,88+r()*12,.3,.8+r()*1.2); }
  /* two steel posts */
  for(const px of [27,73]){ const pg=s.createLinearGradient(px-1.3,0,px+1.3,0); pg.addColorStop(0,'#c9ccd0'); pg.addColorStop(1,'#6d7176'); s.fillStyle=pg; s.fillRect(px-1.3,58,2.6,42); }
  /* the panel: green, a white border, an arrow, two destinations and their distances */
  s.fillStyle='rgba(0,0,0,.25)'; s.beginPath(); s.roundRect(10.6,17.2,80,46,2.4); s.fill();
  const pg=s.createLinearGradient(0,16,0,62); pg.addColorStop(0,'#1b7444'); pg.addColorStop(1,'#11592f'); s.fillStyle=pg; s.beginPath(); s.roundRect(10,16,80,46,2.4); s.fill();
  s.strokeStyle='#f4f6f2'; s.lineWidth=1.1; s.beginPath(); s.roundRect(11.6,17.6,76.8,42.8,1.6); s.stroke();
  s.fillStyle='#f4f6f2'; s.beginPath(); s.moveTo(19.5,22.5); s.lineTo(26,30.5); s.lineTo(22,30.5); s.lineTo(22,55); s.lineTo(17,55); s.lineTo(17,30.5); s.lineTo(13,30.5); s.closePath(); s.fill();
  s.font='700 8.2px "Helvetica Neue",Helvetica,Arial,sans-serif'; s.textBaseline='alphabetic'; s.textAlign='left';
  s.fillText('Fremantle',29.5,35.2); s.fillText('Airport',29.5,52.6);
  s.textAlign='right'; s.fillText('18',85.5,35.2); s.fillText('9',85.5,52.6); s.textAlign='left';
  s.fillStyle='rgba(244,246,242,.55)'; s.fillRect(30,40.6,55.5,.5);
  for(const b of [[14,19.6],[86,19.6],[14,58.4],[86,58.4]]){ s.fillStyle='#9aa1a0'; s.beginPath(); s.arc(b[0],b[1],.55,0,TAU); s.fill(); }
  /* the sun on the panel from the upper left */
  const sh=s.createLinearGradient(10,16,90,62); sh.addColorStop(0,'rgba(255,255,240,.10)'); sh.addColorStop(1,'rgba(0,0,0,.12)'); s.fillStyle=sh; s.beginPath(); s.roundRect(10,16,80,46,2.4); s.fill();
}
function paintOrange(s){
  const r=rng(16021);
  s.fillStyle='#272b2f'; s.fillRect(0,0,100,100);
  for(let i=0;i<11;i++){ const y=r()*110-5, a=(r()-.5)*.09; s.save(); s.translate(0,y); s.rotate(a); s.fillStyle=r()<.5?'rgba(255,255,255,.028)':'rgba(0,0,0,.10)'; s.fillRect(-10,0,120,1.5+r()*8); s.restore(); }
  let g=s.createRadialGradient(12,6,2,12,6,118); g.addColorStop(0,'rgba(150,160,170,.24)'); g.addColorStop(.5,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.38)');
  s.fillStyle=g; s.fillRect(0,0,100,100);
  for(let i=0;i<2200;i++){ const x=r()*100, y=r()*100, q=r(), z=.22+r()*.42; s.fillStyle=q<.55?'rgba(0,0,0,.24)':'rgba(190,198,206,.09)'; s.fillRect(x,y,z,z); }
  /* a whole orange, low left, most of it out of frame */
  const WX=5, WY=99, WR=22;
  g=s.createRadialGradient(WX+5,WY+5,WR*.7,WX+5,WY+5,WR*1.25); g.addColorStop(0,'rgba(0,0,0,.5)'); g.addColorStop(1,'rgba(0,0,0,0)'); s.fillStyle=g; s.beginPath(); s.arc(WX+5,WY+5,WR*1.25,0,TAU); s.fill();
  g=s.createRadialGradient(WX-6,WY-12,1,WX,WY,WR); g.addColorStop(0,'#f6a04c'); g.addColorStop(.45,'#e2681d'); g.addColorStop(1,'#8a3410');
  s.fillStyle=g; s.beginPath(); s.arc(WX,WY,WR,0,TAU); s.fill();
  s.save(); s.beginPath(); s.arc(WX,WY,WR,0,TAU); s.clip();
  for(let i=0;i<260;i++){ const a=r()*TAU, d=Math.sqrt(r())*WR; s.fillStyle=r()<.5?'rgba(90,30,5,.22)':'rgba(255,200,140,.16)'; s.beginPath(); s.arc(WX+Math.cos(a)*d,WY+Math.sin(a)*d,.28+r()*.3,0,TAU); s.fill(); }
  s.restore();
  /* the half: shadow, the rind's side showing low right, then the cut face */
  const OX=58, OY=50, R=31;
  g=s.createRadialGradient(OX+5,OY+6,R*.72,OX+5,OY+6,R*1.2); g.addColorStop(0,'rgba(0,0,0,.6)'); g.addColorStop(1,'rgba(0,0,0,0)'); s.fillStyle=g; s.beginPath(); s.arc(OX+5,OY+6,R*1.2,0,TAU); s.fill();
  g=s.createLinearGradient(OX-R,OY-R,OX+R,OY+R); g.addColorStop(0,'#c45a1e'); g.addColorStop(1,'#7c2c0c');
  s.fillStyle=g; s.beginPath(); s.arc(OX+1.3,OY+2.6,R,0,TAU); s.fill();
  g=s.createLinearGradient(OX-R,OY-R,OX+R,OY+R); g.addColorStop(0,'#f08a3a'); g.addColorStop(1,'#d2601f');
  s.fillStyle=g; s.beginPath(); s.arc(OX,OY,R,0,TAU); s.fill();
  disc(s,OX,OY,R-2.1,'#efdcc0');
  const NS=10, rIn=3.3, rOut=R-3.5, gap=.42, base=-1.33;
  const deep=['#5a0b1f','#6a0f22','#530a1d','#64101f','#5c0c22'], mid=['#8e1729','#a1222d','#86132a','#9b1d2c','#a6302c'], out=['#c8352b','#d4502c','#bf2c2c','#d9632e','#c94130'];
  for(let i=0;i<NS;i++){
    const a0=base+i*TAU/NS+(hash(i,4)-.5)*.06, a1=base+(i+1)*TAU/NS+(hash(i+1,4)-.5)*.06;
    s.save(); s.beginPath(); s.arc(OX,OY,rOut,a0+gap/rOut,a1-gap/rOut); s.arc(OX,OY,rIn,a1-gap/rIn*.6,a0+gap/rIn*.6,true); s.closePath();
    const sg=s.createRadialGradient(OX,OY,rIn,OX,OY,rOut); sg.addColorStop(0,deep[i%5]); sg.addColorStop(.5,mid[(i*3)%5]); sg.addColorStop(1,out[(i*7)%5]);
    s.fillStyle=sg; s.fill(); s.clip();
    /* blood-orange mottle, then the juice vesicles, long along the radius */
    for(let k=0;k<5;k++){ const a=lerp(a0,a1,r()), d=lerp(rIn+4,rOut,r()), bl=s.createRadialGradient(OX+Math.cos(a)*d,OY+Math.sin(a)*d,0,OX+Math.cos(a)*d,OY+Math.sin(a)*d,3+r()*5);
      const orange=r()<.55; bl.addColorStop(0,orange?'rgba(232,118,46,.55)':'rgba(60,4,20,.5)'); bl.addColorStop(1,'rgba(0,0,0,0)'); s.fillStyle=bl; s.fillRect(OX-R,OY-R,2*R,2*R); }
    for(let k=0;k<70;k++){ const a=lerp(a0,a1,r()), d=lerp(rIn+1,rOut-.5,Math.sqrt(r())); s.save(); s.translate(OX+Math.cos(a)*d,OY+Math.sin(a)*d); s.rotate(a); s.fillStyle=r()<.5?'rgba(255,190,170,.2)':'rgba(40,0,10,.22)'; s.beginPath(); s.ellipse(0,0,.9+r()*.7,.3,0,0,TAU); s.fill(); s.restore(); }
    s.restore();
  }
  disc(s,OX,OY,rIn+.5,'#ead0ae');
  g=s.createRadialGradient(OX-12,OY-13,0,OX-12,OY-13,17); g.addColorStop(0,'rgba(255,255,255,.2)'); g.addColorStop(1,'rgba(255,255,255,0)'); s.fillStyle=g; s.beginPath(); s.arc(OX,OY,R-2.1,0,TAU); s.fill();
}

/* POLAR COORDINATES. Pen plotter, ink and one red pen on bone: the end grain of a log, its pith a little off the frame's centre.
   WARP_FX.polarcoords, Direction Rect -> Polar: output column x reads the angle x/W of a turn, row y the radius y/H x the half
   diagonal, so every ring unrolls into a band and the red core line into an upright. Amount is keyed 0 -> 1 and back; the in-between
   pictures are the kernel's own straight blend of the two sample positions. Nearest sampling, edges held, exactly as the kernel. */
function paintLog(s){
  s.fillStyle=BONE; s.fillRect(0,0,100,100);
  const PX=51.6, PY=48.4;
  s.lineJoin='round'; s.lineCap='round'; s.strokeStyle=INK; s.fillStyle=INK;
  const loop=(rf,n)=>{ const pts=[]; for(let k=0;k<=n;k++){ const a=k/n*TAU, rr=rf(a); pts.push([PX+Math.cos(a)*rr,PY+Math.sin(a)*rr]); } return pts; };
  const stroke=(pts,w)=>{ s.lineWidth=w; s.beginPath(); pts.forEach((q,i)=>i?s.lineTo(q[0],q[1]):s.moveTo(q[0],q[1])); s.stroke(); };
  const RAD=[2.7,5.6,8.8,11.6,14.8,17.3,19.6,22.4,24.7,26.7,29.0,31.1,32.9,34.6,36.2];
  RAD.forEach((r0,i)=>{ const p1=hash(i,3)*TAU, p2=hash(i,7)*TAU, p3=hash(i,9)*TAU;
    const pts=loop(a=>r0*(1+.034*Math.sin(2*a+p1)+.02*Math.sin(3*a+p2)+.011*Math.sin(7*a+p3)),180);
    stroke(pts,1.0); s.beginPath(); s.arc(pts[0][0],pts[0][1],.62,0,TAU); s.fill(); });
  /* the bark: two ragged lines and the fissures between them */
  const b1=a=>38.4*(1+.02*Math.sin(2*a+1.1)+.012*Math.sin(9*a+.4)), b2=a=>42.4*(1+.018*Math.sin(2*a+1.3)+.016*Math.sin(13*a+2.2)+.01*Math.sin(23*a));
  stroke(loop(b1,220),1.05); stroke(loop(b2,260),1.2);
  s.lineWidth=.8; for(let k=0;k<52;k++){ const a=k/52*TAU+hash(k,11)*.05, ra=b1(a)+.6, rb=b2(a)-.4-hash(k,13)*1.4; s.beginPath(); s.moveTo(PX+Math.cos(a)*ra,PY+Math.sin(a)*ra); s.lineTo(PX+Math.cos(a+.012)*rb,PY+Math.sin(a+.012)*rb); s.stroke(); }
  /* a drying check: the rings stop at it */
  const TH=-.78, w=r=>.0044*(r-13);
  s.fillStyle=BONE; s.beginPath(); s.moveTo(PX+Math.cos(TH)*13,PY+Math.sin(TH)*13);
  for(let r=13;r<=40;r+=1) s.lineTo(PX+Math.cos(TH-w(r)-.012)*r,PY+Math.sin(TH-w(r)-.012)*r);
  for(let r=40;r>=13;r-=1) s.lineTo(PX+Math.cos(TH+w(r)+.012)*r,PY+Math.sin(TH+w(r)+.012)*r);
  s.closePath(); s.fill();
  s.strokeStyle=INK; s.lineWidth=.8;
  for(const sg of [-1,1]){ s.beginPath(); for(let r=13;r<=39;r+=1){ const a=TH+sg*w(r); r===13?s.moveTo(PX+Math.cos(a)*r,PY+Math.sin(a)*r):s.lineTo(PX+Math.cos(a)*r,PY+Math.sin(a)*r); } s.stroke(); }
  /* the red pen: one core line from the pith out through the bark */
  s.strokeStyle=VERM; s.fillStyle=VERM; s.lineWidth=1.15; s.beginPath(); s.moveTo(PX,PY); s.lineTo(PX-43.4,PY+.4); s.stroke();
  s.beginPath(); s.arc(PX,PY,.75,0,TAU); s.fill();
}

/* POLAR DISPLACEMENT. Viewer overlay: a 32-spoke test star drawn here. drawDisplaceEffect(polar): each pixel samples the layer at
   radius r + (R/255 - .5) x 2 x Radius and angle a + (G/255 - .5) x 2 x Twist about Centre X/Y (46 %, 45 %). The Map layer is a ring:
   green 255 across the band, easing to 128 over its last 1.5 units, red 128, and nothing outside it, so only that band turns. Twist is
   keyed 0 -> 15 -> -15 -> 0 (measured beside the real render: the band turns 15 degrees in both). The dashed hairlines are the map's extent. */
const STAR={X:46,Y:45,R:41,N:32};
function paintStar(s){
  disc(s,STAR.X,STAR.Y,STAR.R,BONE);
  s.fillStyle=INK;
  for(let i=0;i<STAR.N;i+=2){ const a0=-Math.PI/2+i*TAU/STAR.N, a1=a0+TAU/STAR.N; s.beginPath(); s.moveTo(STAR.X,STAR.Y); s.arc(STAR.X,STAR.Y,STAR.R,a0,a1); s.closePath(); s.fill(); }
  s.strokeStyle=INK; s.lineWidth=.9; s.beginPath(); s.arc(STAR.X,STAR.Y,STAR.R-.45,0,TAU); s.stroke();
}
const MAPBAND=[15,16.5,26.5,28];
const mapBump=r=>r<=MAPBAND[0]||r>=MAPBAND[3]?0:r<MAPBAND[1]?smooth((r-MAPBAND[0])/(MAPBAND[1]-MAPBAND[0])):r<=MAPBAND[2]?1:smooth((MAPBAND[3]-r)/(MAPBAND[3]-MAPBAND[2]));

/* RGB SPLIT. Broadcast bench: a two-line title on its own layer over black, title-safe corners as furniture. drawRgbSplit's plain
   path (Angle 0, Toward edges 0, Green 0): red read Amount px to the right, blue Amount px to the left, alpha the most of the
   three. Amount ticks at 25 fps: a hit of 30 that settles at 22 and holds, a drop-out, a smaller hit of 22 into 12, a drop-out. */
const TITLE=['AFTER','HOURS'];
function paintTitle(s,n){
  s.fillStyle='#eef2f8'; s.textAlign='left'; s.textBaseline='alphabetic';
  s.font=SANS(20); const w=Math.max(...TITLE.map(t=>s.measureText(t).width)), fs=20*74/w;
  s.font=SANS(fs); s.fillText(TITLE[0],12.5,47.5); s.fillText(TITLE[1],12.5,47.5+fs*1.04);
}

/* SQUEEZE. Two-ink print, teal and yellow overprinted on bone, the yellow plate 0.7 out of register: a tower drawn here, and a
   lit wall on its left. WARP_FX.squeeze, Pinches Horizontally, Waist at 50 %: each row y reads x from cx + (x - cx) / f with
   f = 1 - Amount x sin(pi y / H), floored at .05, nearest sampling, edges held. Amount is keyed 0 -> .5 (the default) -> -.35 -> 0. */
function paintTower(s){
  const r=rng(16061);
  s.fillStyle=BONE; s.fillRect(0,0,100,100);
  const plate=(ink,dx,dy,draw)=>{ s.save(); s.globalCompositeOperation='multiply'; s.translate(dx,dy); s.fillStyle=ink; draw(); s.restore(); };
  const TX0=30, TX1=70, COLS=[32.6,40.0,47.4,54.8,62.2], WW=4.6, WH=2.5, ROW=4.7;
  const lit=new Set(); for(let i=0;i<28;i++) lit.add(((r()*5)|0)+','+((r()*22)|0));
  /* yellow plate: the lit wall, and the lit windows */
  plate(RYEL,.7,-.5,()=>{ s.fillRect(-2,-2,40,104);
    for(let j=0;j<22;j++) for(let i=0;i<5;i++){ if(lit.has(i+','+j)&&COLS[i]>38) s.fillRect(COLS[i],1.2+j*ROW,WW,WH); } });
  /* teal plate: the tower with its windows knocked out, a fin, and a plinth line */
  plate(RTEAL,0,0,()=>{ s.beginPath(); s.rect(TX0,-2,TX1-TX0,104);
    for(let j=0;j<22;j++) for(let i=0;i<5;i++){ const x=COLS[i], y=1.2+j*ROW; s.rect(x+WW,y,-WW,WH); }
    s.fill('nonzero'); s.fillRect(TX1+2.2,-2,2.4,104); });
  /* riso: ink dropping out of the solids, specks on the paper */
  for(let i=0;i<900;i++){ const x=r()*100, y=r()*100, z=.18+r()*.32; s.fillStyle=r()<.8?'rgba(231,226,213,.55)':'rgba(31,127,112,.5)'; s.fillRect(x,y,z,z); }
}

/* SQUISH. Chronophotograph, black and silver: a 216 px ball layer keyed to bounce across the frame, Walls: Floor, every other
   control at its default (Strength 1, Spread 120 %, Bulge 65 %, Firmness 30 %). drawSquish's floor map, run here per row: the
   overhang pulls back to the wall along the cubic falloff, rows past the wall widen toward the wall's chord, and the spread is
   soft-capped by the room left to the side walls. The plate takes one exposure per 1/5 s beat (two land on the contacts), holds,
   is cleared, and then the single layer runs live. */
const SQ={R:10,AMT:1,SPREAD:1.2,BULGE:.65,FIRM:.3,LMIN:2*100/1080,SOFT:.12,FLAT:6,ROOMY:1.15};
const sqHalf=(s,Cy)=>{ const q=SQ.R*SQ.R-(s-Cy)*(s-Cy); return q>0?Math.sqrt(q):0; };
function sqPrep(Cx,Cy){
  const R=SQ.R, by0=Cy-R, by1=Cy+R, tMin=SQ.FIRM*2*R, wB=Math.max(100,by0+tMin), pB=Math.max(0,by1-wB)*SQ.AMT;
  if(pB<.001) return null;
  const L=Math.max(SQ.SPREAD*Math.sqrt(2*R*pB),SQ.LMIN), D=Math.max(SQ.LMIN,wB-by0), c0=Math.pow(Math.max(0,1-D/L),3), n=1/(1-c0);
  const limX=Math.max(1,Math.min((100-Cx)/R,Cx/R));
  return {Cy,by0,by1,wB,pB,L,c0,n,k:3*pB*n/L,e:Math.min(L,D),mS:limX-1,wRef:2*sqHalf(wB,Cy)};
}
/* destination row centre (units) -> [source row, horizontal scale], sqAxis + sqStretch for one live floor */
function sqRow(pos,Q){
  let m=pos, J=1; const dd=Q.wB-pos;
  if(dd<=0){ m+=Q.pB-dd*Q.k; J+=Q.k; }
  else if(dd<Q.e){ const u=1-dd/Q.L; m+=Q.pB*(u*u*u-Q.c0)*Q.n; J+=Q.k*u*u; }
  let Ev=1+SQ.BULGE*(J-1);
  if(m>Q.wB&&Q.wRef>0){ const w=2*sqHalf(m,Q.Cy); let F=w>.046?Q.wRef/w:SQ.FLAT; if(F>SQ.FLAT) F=SQ.FLAT; F=1+SQ.BULGE*(F-1);
    if(F>Ev){ const q=F-Ev; Ev=F+SQ.SOFT*Math.log1p(Math.exp(-q/SQ.SOFT)); } else { const q=Ev-F; Ev=Ev+SQ.SOFT*Math.log1p(Math.exp(-q/SQ.SOFT)); } }
  return [m, Q.mS>1e-4?1+Q.mS*(1-Math.exp(-(Ev-1)/Q.mS)):1];
}
/* the keyed path: parabolic arcs between floor contacts (time, how far the layer's box goes past touching), g 900 units/s^2,
   crossing the frame at 70 units/s; both contacts fall on the 1/5 s exposures, well clear of the side edges */
const SQPATH={VX:70,X0:-12,G:900,K:[[-0.4,0],[.6,9],[1.2,6],[1.65,0]]};
function sqAt(t){
  const x=SQPATH.X0+SQPATH.VX*t, Ct=100-SQ.R, K=SQPATH.K;
  for(let i=0;i<K.length-1;i++){ const [a,da]=K[i], [b,db]=K[i+1]; if(t<=b){ return [x, Ct+lerp(da,db,(t-a)/(b-a))-SQPATH.G/2*(t-a)*(b-t)]; } }
  return [x,Ct];
}

window.FX_TILES.push(

{ id:'mirror', name:'Mirror', section:'Warping', isNew:true, still:2.4,
  line:'One side of the frame is reflected onto the other, so the picture turns symmetrical about the seam.',
  make(px){
    const P=4.4, [S,s]=canvasOf(px); paintProfile(s);
    const seam=u=>u<.6?100:u<1.5?100-50*E.out(seg(u,.6,1.5)):u<3.4?50:u<4.1?50+50*E.inOut(seg(u,3.4,4.1)):100;
    return (c,t)=>{
      const f=Math.floor(mod(t,P)*12)/12, sx=seam(f); unit(c,px);
      c.save(); c.beginPath(); c.rect(0,0,sx,100); c.clip(); c.drawImage(S,0,0,100,100); c.restore();
      if(sx<100){ c.save(); c.beginPath(); c.rect(sx,0,100-sx,100); c.clip(); c.translate(2*sx,0); c.scale(-1,1); c.drawImage(S,0,0,100,100); c.restore(); }
      /* the seam, marked at the frame's edges like a cutting mark */
      c.fillStyle=VERM; c.beginPath(); c.moveTo(sx-2.4,0); c.lineTo(sx+2.4,0); c.lineTo(sx,3.6); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(sx-2.4,100); c.lineTo(sx+2.4,100); c.lineTo(sx,96.4); c.closePath(); c.fill();
    };
  } },

{ id:'pixelate', name:'Pixelate', section:'Warping', isNew:true, still:2.2,
  line:'The picture is rebuilt from square blocks of its own colour; the bigger the block, the more detail goes.',
  make(px){
    const P=4.4, [S,s]=canvasOf(px); paintSign(s);
    const LV=[12,24,48].map(b=>{ const n=Math.max(1,Math.round(1080/b)), [C,x]=blank(n); x.imageSmoothingEnabled=true; x.drawImage(S,0,0,n,n); return {C,n,b}; });
    return (c,t)=>{
      const u=mod(t,P), k=u<.8?-1:u<1.05?0:u<1.3?1:u<3.4?2:-1;
      raw(c);
      if(k<0) c.drawImage(S,0,0);
      else { c.imageSmoothingEnabled=false; c.drawImage(LV[k].C,0,0,LV[k].n,LV[k].n,0,0,px,px); c.imageSmoothingEnabled=true; }
      unit(c,px); tab(c,4,90.5,'BLOCK '+(k<0?1:LV[k].b),4.6,BONE,INK);
    };
  } },

{ id:'polarcoords', name:'Polar Coordinates', section:'Warping', isNew:true, still:2.6,
  line:'Rect to Polar unrolls the picture around its centre: rings become straight bands and spokes stand upright.',
  make(px){
    const P=4.6, N=Math.min(px,360), LVN=12, {C:S,data:src}=pixelsOf(N,paintLog);
    const cx=N/2, cy=N/2, maxR=Math.hypot(cx,cy), cosX=new Float64Array(N), sinX=new Float64Array(N), rY=new Float64Array(N);
    for(let x=0;x<N;x++){ const a=(x/N)*TAU; cosX[x]=Math.cos(a); sinX[x]=Math.sin(a); }
    for(let y=0;y<N;y++) rY[y]=(y/N)*maxR;
    const LV=[S];
    for(let l=1;l<=LVN;l++){ const amt=l/LVN, [C,x]=blank(N), im=x.createImageData(N,N), o=im.data;
      for(let y=0,j=0;y<N;y++) for(let xx=0;xx<N;xx++,j+=4){
        let sx=(xx+(cx+cosX[xx]*rY[y]-xx)*amt)|0, sy=(y+(cy+sinX[xx]*rY[y]-y)*amt)|0;
        if(sx<0) sx=0; else if(sx>=N) sx=N-1; if(sy<0) sy=0; else if(sy>=N) sy=N-1;
        const i=(sy*N+sx)*4; o[j]=src[i]; o[j+1]=src[i+1]; o[j+2]=src[i+2]; o[j+3]=src[i+3]; }
      x.putImageData(im,0,0); LV.push(C); }
    const amount=u=>u<.6?0:u<1.8?E.inOut(seg(u,.6,1.8)):u<3.5?1:u<4.3?1-E.inOut(seg(u,3.5,4.3)):0;
    return (c,t)=>{
      const f=Math.floor(mod(t,P)*12)/12, a=amount(f), k=Math.round(a*LVN);
      raw(c); c.drawImage(LV[k],0,0,px,px);
      unit(c,px); c.font=MONO(4.4); c.fillStyle=INK; c.textAlign='left'; c.textBaseline='middle'; c.fillText('AMOUNT '+(k/LVN).toFixed(2),4.5,95.5);
    };
  } },

{ id:'polardisplace', name:'Polar Displacement', section:'Warping', isNew:true, still:2.0,
  line:'A map layer pushes the picture round and out from a centre; here a ring-shaped map turns just one band of a test star.',
  make(px){
    const P=5, N=Math.min(px,300), {C:S,data:src}=pixelsOf(N,paintStar);
    const [O,ox]=blank(N), oi=ox.createImageData(N,N), o=oi.data; o.set(src);
    const k=N/100, cx=N*STAR.X/100, cy=N*STAR.Y/100, idx=[], RR=[], AA=[], KK=[];
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){ const dx=x-cx, dy=y-cy, r=Math.hypot(dx,dy), b=mapBump(r/k); if(b<=0) continue;
      const g=Math.round(128+127*b); idx.push((y*N+x)*4); RR.push(r); AA.push(Math.atan2(dy,dx)); KK.push((g/255-.5)*2); }
    const DR=(128/255-.5)*2*40*N/1080;   /* red 128 in the map, Radius 40 px: a push of a sixth of a pixel */
    let last=null;
    const paint=T=>{ if(T===last) return; last=T; const ang=T*Math.PI/180;
      for(let i=0;i<idx.length;i++){ const a=AA[i]+KK[i]*ang, r=RR[i]+DR; let sx=(cx+Math.cos(a)*r)|0, sy=(cy+Math.sin(a)*r)|0;
        if(sx<0) sx=0; else if(sx>=N) sx=N-1; if(sy<0) sy=0; else if(sy>=N) sy=N-1;
        const si=(sy*N+sx)*4, j=idx[i]; o[j]=src[si]; o[j+1]=src[si+1]; o[j+2]=src[si+2]; o[j+3]=src[si+3]; }
      ox.putImageData(oi,0,0); };
    const twist=u=>u<.55?0:u<1.5?15*settle(seg(u,.55,1.5)):u<2.5?15:u<3.2?lerp(15,-15,E.inOut(seg(u,2.5,3.2))):u<4?-15:u<4.6?lerp(-15,0,E.inOut(seg(u,4,4.6))):0;
    return (c,t)=>{
      const f=Math.floor(mod(t,P)*15)/15, T=Math.round(twist(f)); paint(T);
      unit(c,px); c.fillStyle=NAVY; c.fillRect(0,0,100,100); c.drawImage(O,0,0,100,100);
      /* the map layer's extent, the centre anchor, the readout */
      c.strokeStyle=DIM; c.lineWidth=.45; c.setLineDash([1.3,1.1]);
      for(const r of [MAPBAND[0],MAPBAND[3]]){ c.beginPath(); c.arc(STAR.X,STAR.Y,r,0,TAU); c.stroke(); }
      c.setLineDash([]);
      c.fillStyle=TEAL; c.fillRect(STAR.X-1.3,STAR.Y-1.3,2.6,2.6); c.fillStyle=NAVY; c.fillRect(STAR.X-.5,STAR.Y-.5,1,1);
      const on=(f>=1.5&&f<2.5)||(f>=3.2&&f<4)||f<.55||f>=4.6;
      c.fillStyle=on?YEL:DIM; c.beginPath(); c.moveTo(6.5,90.4); c.lineTo(8.6,92.5); c.lineTo(6.5,94.6); c.lineTo(4.4,92.5); c.closePath(); c.fill();
      c.font=MONO(5.6); c.fillStyle=TEXT; c.textAlign='left'; c.textBaseline='middle'; c.fillText('TWIST '+(T>0?'+':T<0?'−':'')+Math.abs(T)+'°',11,92.8);
    };
  } },

{ id:'rgbsplit', name:'RGB Split', section:'Warping', isNew:true, still:1.6,
  line:'The red and blue channels slide apart in opposite directions, so every edge picks up coloured fringes.',
  make(px){
    const P=4, N=px, {C:S,data:src}=pixelsOf(N,paintTitle);
    const split=amt=>{ const dd=Math.round(amt*N/1080), [C,x]=blank(N), im=x.createImageData(N,N), o=im.data;
      for(let y=0;y<N;y++){ const row=y*N; for(let xx=0;xx<N;xx++){ const i=(row+xx)*4, ri=(row+Math.min(N-1,xx+dd))*4, bi=(row+Math.max(0,xx-dd))*4;
        o[i]=src[ri]; o[i+1]=src[i+1]; o[i+2]=src[bi+2]; o[i+3]=Math.max(src[i+3],src[ri+3],src[bi+3]); } }
      x.putImageData(im,0,0); return C; };
    const LV={0:S,30:split(30),22:split(22),12:split(12)};
    const amountAt=fr=>fr<15?0:fr<17?30:fr<59?22:fr<72?0:fr<74?22:fr<85?12:0;
    return (c,t)=>{
      const fr=Math.floor(mod(t,P)*25), a=amountAt(fr);
      raw(c); c.fillStyle='#000'; c.fillRect(0,0,px,px); c.drawImage(LV[a],0,0);
      unit(c,px); c.strokeStyle=DIM; c.lineWidth=.6;
      for(const [x,y,sx,sy] of [[10,10,1,1],[90,10,-1,1],[10,90,1,-1],[90,90,-1,-1]]){ c.beginPath(); c.moveTo(x+sx*4.5,y); c.lineTo(x,y); c.lineTo(x,y+sy*4.5); c.stroke(); }
      c.font=MONO(4.4); c.fillStyle=DIM; c.textAlign='left'; c.textBaseline='middle'; c.fillText('AMOUNT '+String(a).padStart(2,'0')+' PX',10,95.6);
    };
  } },

{ id:'squeeze', name:'Squeeze', section:'Warping', isNew:true, still:2.0,
  line:'The layer is pinched in at its waist; take Amount below zero and it bulges out instead.',
  make(px){
    const P=4.6, N=Math.min(px,340), {C:S,data:src}=pixelsOf(N,paintTower);
    const STEP=.05, cx=N/2, LV=new Map();
    for(let q=-7;q<=12;q++){ const amt=q*STEP; if(!q){ LV.set(0,S); continue; } const [C,x]=blank(N), im=x.createImageData(N,N), o=im.data;
      for(let y=0,j=0;y<N;y++){ let f=1-amt*Math.sin(Math.PI*y/N); if(f<.05) f=.05;
        for(let xx=0;xx<N;xx++,j+=4){ let sx=(cx+(xx-cx)/f)|0; if(sx<0) sx=0; else if(sx>=N) sx=N-1; const i=(y*N+sx)*4; o[j]=src[i]; o[j+1]=src[i+1]; o[j+2]=src[i+2]; o[j+3]=src[i+3]; } }
      x.putImageData(im,0,0); LV.set(q,C); }
    const amount=u=>u<.5?0:u<1.4?.5*settle(seg(u,.5,1.4)):u<2.6?.5:u<3.2?lerp(.5,-.35,E.inOut(seg(u,2.6,3.2))):u<3.9?-.35:u<4.4?lerp(-.35,0,E.inOut(seg(u,3.9,4.4))):0;
    return (c,t)=>{
      const f=Math.floor(mod(t,P)*12)/12, q=clamp(Math.round(amount(f)/STEP),-7,12);
      raw(c); c.drawImage(LV.get(q),0,0,px,px);
      unit(c,px); const v=q*STEP, txt='AMOUNT '+(v>0?'+':v<0?'−':'')+Math.abs(v).toFixed(2); c.font=MONO(3.9); tab(c,97-c.measureText(txt).width-3.9*.9,91.5,txt,3.9,INK,BONE);
    };
  } },

{ id:'squish', name:'Squish', section:'Warping', isNew:true, still:2.2,
  line:'When the layer runs into the edge of the frame it flattens against it and spreads, instead of being cut off.',
  make(px){
    /* the plate builds one exposure per 1/5 s beat as the ball crosses, holds, then the plate is cleared and the layer runs live */
    const P=5, R=SQ.R, CROSS=1.75, LIVE=3, k=px/100, EXP=[];
    for(let i=1;i<=12;i++){ const te=i/5, [x,y]=sqAt(te); if(x-R>100) break; EXP.push({te,x,y}); }
    const SP=Math.max(8,Math.ceil(2*R*k)), [B,bx]=blank(SP);
    { const g=bx.createRadialGradient(SP*.36,SP*.3,SP*.04,SP*.5,SP*.5,SP*.5); g.addColorStop(0,'#ffffff'); g.addColorStop(.5,'#dcdee1'); g.addColorStop(.88,'#9a9da3'); g.addColorStop(1,'#74777d');
      bx.fillStyle=g; bx.beginPath(); bx.arc(SP/2,SP/2,SP/2,0,TAU); bx.fill(); }
    /* the layer at time te, drawn through the effect's own rows */
    const ball=(c,x,y)=>{ const Q=sqPrep(x,y); c.setTransform(1,0,0,1,0,0);
      if(!Q){ c.drawImage(B,(x-R)*k,(y-R)*k,2*R*k,2*R*k); return; }
      for(let yy=Math.max(0,Math.floor(Q.by0*k));yy<px;yy++){ const pos=(yy+.5)/k, [m,sc]=sqRow(pos,Q); if(m<Q.by0||m>Q.by1) continue;
        const sr=clamp((m-Q.by0)/(2*R)*SP-.5,0,SP-1), w=2*R*sc*k; c.drawImage(B,0,sr,SP,1,x*k-w/2,yy,w,1); } };
    /* the whole plate, exposed once here */
    const [PL,pl]=blank(px); pl.globalCompositeOperation='screen'; pl.globalAlpha=.92; EXP.forEach(e=>ball(pl,e.x,e.y));
    const rule=c=>{ c.strokeStyle=SILVER; c.globalAlpha=.55; c.lineWidth=.4;
      for(let i=0;i<=20;i++){ const x=i*5, h=i%10===0?3.4:i%2===0?2.2:1.2; c.beginPath(); c.moveTo(x,0); c.lineTo(x,h); c.stroke(); }
      c.globalAlpha=.85; c.font=MONO(3.8); c.fillStyle=SILVER; c.textAlign='right'; c.textBaseline='middle'; c.fillText('1/5 S',97,7.2); c.globalAlpha=1; };
    return (c,t)=>{
      const u=mod(t,P); unit(c,px); c.fillStyle='#000'; c.fillRect(0,0,100,100); rule(c);
      if(u<LIVE){ /* the plate: every exposure whose beat has passed */
        c.globalCompositeOperation='screen'; c.globalAlpha=.92;
        if(u>=CROSS) { c.setTransform(1,0,0,1,0,0); c.drawImage(PL,0,0); }
        else for(const e of EXP){ if(e.te>u) break; ball(c,e.x,e.y); }
        c.globalCompositeOperation='source-over'; c.globalAlpha=1; return; }
      const [x,y]=sqAt(u-LIVE); if(x-R>100) return;
      ball(c,x,y);
    };
  } }

);
})();
