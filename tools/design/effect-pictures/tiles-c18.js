/* FreeMotion effect pictures, artist 18 (c18): Wrap Shift, Drift, Wiggle, Circle Array, Trail, Tiles, Chunk Noise.
   No photographs: every subject is made here, and every change is the effect's own arithmetic from js/compositor.js. */
(function(){ 'use strict';
const {TAU,clamp,lerp,seg,E,rng}=window.FXK;

const BONE='#e7e2d5', INK='#16130f', COAL='#0c0c0d', NAVY='#161c28', HAIR='#2b3547', TEXT='#eef2f8', DIM='#8b96a8', VERM='#e4471d', TEAL='#29d9bb';
const MONO=s=>'bold '+s+'px "Courier Prime","Courier New",monospace';
const mod=(t,P)=>((t%P)+P)%P;
const reset=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; c.imageSmoothingEnabled=true; c.setLineDash([]); };
const sheet=(w,h)=>{ const C=document.createElement('canvas'); C.width=Math.max(1,Math.round(w)); C.height=Math.max(1,Math.round(h===undefined?w:h)); return [C,C.getContext('2d')]; };
function tab(c,x,y,txt,s,bg,fg){ c.font=MONO(s); const w=c.measureText(txt).width; c.fillStyle=bg; c.fillRect(x,y,w+s*.9,s*1.5); c.fillStyle=fg; c.textBaseline='middle'; c.textAlign='left'; c.fillText(txt,x+s*.45,y+s*.8); return w+s*.9; }
function poly(c,p){ c.beginPath(); for(let i=0;i<p.length;i+=2){ if(i) c.lineTo(p[i],p[i+1]); else c.moveTo(p[i],p[i+1]); } c.closePath(); }
const hex=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const mixHex=(a,b,p)=>{ const A=hex(a), B=hex(b); return 'rgb('+Math.round(lerp(A[0],B[0],p))+','+Math.round(lerp(A[1],B[1],p))+','+Math.round(lerp(A[2],B[2],p))+')'; };
/* an integer hash, 0..1 */
const ih=n=>{ n=Math.imul(n^(n>>>16),0x45d9f3b); n=Math.imul(n^(n>>>16),0x45d9f3b); n=n^(n>>>16); return (n>>>0)/4294967296; };
/* lattice value noise on that hash; py > 0 wraps the y lattice (a texture that tiles vertically) */
function n2(x,y,seed,py){ const xi=Math.floor(x), yi=Math.floor(y), fx=x-xi, fy=y-yi, u=fx*fx*(3-2*fx), v=fy*fy*(3-2*fy);
  const Y0=py?((yi%py)+py)%py:yi, Y1=py?(((yi+1)%py)+py)%py:yi+1;
  const h=(a,b)=>ih(Math.imul(a,73856093)^Math.imul(b,19349663)^Math.imul(seed+1,83492791));
  return lerp(lerp(h(xi,Y0),h(xi+1,Y0),u),lerp(h(xi,Y1),h(xi+1,Y1),u),v); }
function fbm(x,y,seed,oct){ let s=0,a=.5,f=1,n=0; for(let i=0;i<oct;i++){ s+=a*n2(x*f,y*f,seed+i*31); n+=a; a*=.5; f*=2.03; } return s/n; }
/* a w x h canvas painted pixel by pixel: fn(x, y, out) writes out=[r,g,b,a] (written with putImageData, never read back) */
function paint(w,h,fn){ const [C,x]=sheet(w,h), im=x.createImageData(C.width,C.height), d=im.data, o=[0,0,0,255]; let j=0;
  for(let y=0;y<C.height;y++) for(let i=0;i<C.width;i++){ o[3]=255; fn(i,y,o); d[j]=o[0]; d[j+1]=o[1]; d[j+2]=o[2]; d[j+3]=o[3]; j+=4; }
  x.putImageData(im,0,0); return C; }

window.FX_TILES.push(

/* WRAP SHIFT. Graded still: an overhead street shot, painted here: a fallen ginkgo leaf on wet granite setts, light from the upper left.
   WARP_FX.wrapshift is ((x - dx) mod W, (y - dy) mod H) with dx = round(W x Shift X / 100): the whole frame slides and nothing is
   lost, it comes back in at the opposite edge. Shift X travels 0 to 50 %, then Shift Y 0 to 50 % (the leaf lands in four pieces
   in the corners), then both run on to 100 %, which is no shift at all. The paving repeats exactly across the frame, so only the
   leaf shows the seam, which is what Wrap Shift is for: a picture that tiles slides for ever. */
{ id:'wrapshift', name:'Wrap Shift', section:'Warping', isNew:true, still:1.7,
  line:'The whole picture slides over, and whatever goes off one edge comes straight back in at the opposite edge.',
  make(px){
    const P=5.2, k=px/100, UX=40, UY=45, UR=22, gp=Math.min(px,480), gk=gp/100;
    /* wet granite setts in running bond, 16 to a row and 20 rows to the frame, so the paving itself tiles */
    const SW=6.25, SH=5;
    const GR=paint(gp,gp,(x,y,o)=>{ const X=x/gk, Y=y/gk, row=Math.floor(Y/SH)%20, sx=X+(row&1?SW/2:0), col=Math.floor(sx/SW)%16;
      const lx=mod(sx,SW), ly=mod(Y,SH), jx=Math.min(lx,SW-lx), jy=Math.min(ly,SH-ly), sp=ih(x*7919+y*104729+5);
      const shade=.74+.36*ih(row*131+col*17+3), dome=1+.12*(1-Math.hypot((lx-SW*.42)/(SW*.6),(ly-SH*.4)/(SH*.6)));
      let l=88*shade*dome+(sp-.5)*20+(sp>.993?26:0);
      const j=clamp((Math.min(jx,jy)-.05)/.55); l=lerp(24,l,j*j*(3-2*j));
      o[0]=l; o[1]=l+1; o[2]=l+4; });
    const [ART,a]=sheet(px); a.drawImage(GR,0,0,px,px); a.setTransform(k,0,0,k,0,0);
    /* (art director, ad) a fallen ginkgo leaf on the wet setts, where a red umbrella was: the umbrella from above matched Palette
       Map's beach parasols. A gold fan, wavy at its rim and split at the middle, fine veins fanning from the stem, lit from the upper left. */
    const LR=31, ROT=.42, HX=UX-5, HY=UY+17, leaf=new Path2D(), A0=-Math.PI*.86, A1=-Math.PI*.14;
    leaf.moveTo(HX,HY);
    for(let i=0;i<=240;i++){ const f=i/240, ph=lerp(A0,A1,f), mid=(A0+A1)/2, notch=.36*Math.exp(-Math.pow((ph-mid)/.07,2)), side=Math.min(1,Math.min(f,1-f)*9);
      const rr=LR*(1+.035*Math.sin(ph*19)-notch)*(.55+.45*side), q=ph+ROT, X=HX+rr*Math.cos(q), Y=HY+rr*Math.sin(q); leaf.lineTo(X,Y); }
    leaf.closePath();
    const sA=Math.PI/2+ROT, sx1=HX+Math.cos(sA)*13+2, sy1=HY+Math.sin(sA)*13;
    a.save(); a.shadowColor='rgba(6,6,8,.55)'; a.shadowBlur=1.6*k; a.shadowOffsetX=(300+1.6)*k; a.shadowOffsetY=1.9*k; a.translate(-300,0);
    a.fillStyle='#000'; a.fill(leaf); a.strokeStyle='#000'; a.lineWidth=.9; a.beginPath(); a.moveTo(HX,HY); a.quadraticCurveTo(HX+2,HY+6,sx1,sy1); a.stroke(); a.restore();
    const lg=a.createRadialGradient(HX,HY,0,HX,HY,LR); lg.addColorStop(0,'#b07a14'); lg.addColorStop(.35,'#e0a92c'); lg.addColorStop(1,'#f4cf4e');
    a.fillStyle=lg; a.fill(leaf);
    a.save(); a.clip(leaf);
    const lt=a.createLinearGradient(HX-LR,HY-LR,HX+LR,HY); lt.addColorStop(0,'rgba(255,250,220,.22)'); lt.addColorStop(1,'rgba(90,50,0,.22)'); a.fillStyle=lt; a.fillRect(HX-LR,HY-LR,2*LR,LR+2);
    a.strokeStyle='rgba(140,92,10,.45)'; a.lineWidth=.16;
    for(let i=0;i<=34;i++){ const ph=lerp(A0+.05,A1-.05,i/34)+ROT; a.beginPath(); a.moveTo(HX,HY); a.lineTo(HX+LR*1.05*Math.cos(ph),HY+LR*1.05*Math.sin(ph)); a.stroke(); }
    a.restore();
    a.strokeStyle='rgba(120,74,6,.55)'; a.lineWidth=.3; a.stroke(leaf);
    a.strokeStyle='#8a5a12'; a.lineWidth=.8; a.lineCap='round'; a.beginPath(); a.moveTo(HX,HY); a.quadraticCurveTo(HX+2,HY+6,sx1,sy1); a.stroke();
    /* a few beads of rain on it */
    const RB=rng(88); for(let i=0;i<7;i++){ const q=lerp(A0,A1,RB())+ROT, d=LR*(.3+RB()*.6), bx=HX+Math.cos(q)*d, by=HY+Math.sin(q)*d; a.fillStyle='rgba(255,250,235,.55)'; a.beginPath(); a.arc(bx,by,.3+RB()*.3,0,TAU); a.fill(); }
    const SX=u=>u<.6?0:u<1.35?50*E.inOut(seg(u,.6,1.35)):u<3.6?50:u<4.5?50+50*E.inOut(seg(u,3.6,4.5)):100;
    const SY=u=>u<2.1?0:u<2.85?50*E.inOut(seg(u,2.1,2.85)):u<3.6?50:u<4.5?50+50*E.inOut(seg(u,3.6,4.5)):100;
    return (c,t)=>{
      const u=mod(t,P), X=SX(u), Y=SY(u);
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over';
      const dx=Math.round((X%100)*k), dy=Math.round((Y%100)*k);
      c.drawImage(ART,dx,dy); c.drawImage(ART,dx-px,dy); c.drawImage(ART,dx,dy-px); c.drawImage(ART,dx-px,dy-px);
      reset(c,px);
      tab(c,3,92,'SHIFT X '+String(Math.round(X)).padStart(3,' ')+'%  Y '+String(Math.round(Y)).padStart(3,' ')+'%',4.2,INK,BONE);
    };
  } },

/* DRIFT. Cut paper: an airship, ink with vermilion fins, on a bone sky over an ink field. CANVAS_FX.drift moves the layer by Speed x
   the clip's own seconds, nothing else: no easing, no turn. Speed X 350 px/s on a 1080 frame is 32.4 units a second. Wrap around
   frame On: the layer's whole box runs round a loop one frame plus one layer long, so it is never cut in two and never doubled. The
   loop of the tile is exactly that wrap period, (100 + 60) / 32.4 s. The mooring mast is another layer and stands still.
   (Redrawn by checker 3: the ocean liner repeated Sepia's liner.) */
{ id:'drift', name:'Drift', section:'Shakes / Movement', isNew:true, still:1.25,
  line:'The layer glides across at one steady speed; with Wrap on it leaves one side and comes back in at the other.',
  make(px){
    const V=350/10.8, L=60, P=(100+L)/V, X0=-22, GY=82, AY=27, k=px/100;
    /* the airship, its box 0..60 across and 0..28 down, nose to the right, scissor cut */
    const [S,s]=sheet(62*k,30*k); s.setTransform(k,0,0,k,k,k);
    s.fillStyle=VERM;
    poly(s,[4.2,1.4, 9.6,1.6, 17.6,8.4, 8.6,10.6, 2.6,10.4]); s.fill();           /* upper fin */
    poly(s,[2.6,15.8, 8.6,15.6, 17.4,17.8, 9.4,24.8, 4.0,25.0]); s.fill();        /* lower fin */
    s.fillStyle=INK;
    s.beginPath(); s.moveTo(58.6,12.8); s.bezierCurveTo(58.2,5.4,45,3.6,31,3.7); s.bezierCurveTo(19,3.8,9.4,7.4,4.6,12.9);
    s.bezierCurveTo(9.4,18.4,19,22.1,31,22.2); s.bezierCurveTo(45,22.3,58.2,20.4,58.6,12.8); s.closePath(); s.fill();
    poly(s,[27.4,21.4, 40.6,21.2, 39.6,25.6, 28.8,25.8]); s.fill();               /* the gondola */
    s.strokeStyle=INK; s.lineWidth=.7; s.beginPath(); s.moveTo(31.5,21.8); s.lineTo(30.6,27.8); s.stroke();
    s.fillStyle=VERM; poly(s,[0.6,12.2, 12.2,12.0, 12.2,13.8, 0.6,13.6]); s.fill();  /* the stern plane, edge on */
    /* light from the upper left: one bone sliver along the top of the envelope, and the gondola's windows */
    s.fillStyle=BONE;
    s.beginPath(); s.moveTo(15.2,7.6); s.bezierCurveTo(22,5.4,32,4.9,44,5.6); s.lineTo(44,6.5); s.bezierCurveTo(32,5.9,22,6.4,15.6,8.5); s.closePath(); s.fill();
    for(const wx of [30.2,33.2,36.2]) s.fillRect(wx,22.6,1.7,1.2);
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      c.fillStyle=BONE; c.fillRect(0,0,100,100);
      c.fillStyle=INK; c.fillRect(0,GY,100,100-GY);
      /* the mooring mast: another layer, standing still */
      c.fillStyle=INK; poly(c,[83.2,GY, 85.4,52.4, 86.8,52.4, 89,GY]); c.fill();
      c.fillRect(83.6,50.4,4.2,2.6);
      c.fillStyle=VERM; c.fillRect(84.9,47.6,1.6,2.8);
      c.strokeStyle=BONE; c.lineWidth=.45; c.beginPath();
      for(let y=GY-5;y>56;y-=6.2){ const w=(y-52.4)/(GY-52.4); c.moveTo(85.4-2.2*w+.5,y); c.lineTo(86.8+2.2*w-.5,y-5.4); }
      c.stroke();
      /* the layer: box left on the wrap loop */
      const x=mod(X0+V*u+L,100+L)-L;
      c.drawImage(S,x-1,AY-1,62,30);
      c.font=MONO(4.3); c.fillStyle='#bdb7aa'; c.textAlign='left'; c.textBaseline='middle';
      c.fillText('X 350 PX/S',5,89.5); c.fillText('WRAP ON',5,95);
    };
  } },

/* WIGGLE. Viewer overlay, the comp seen at 350 % so 40 px reads: a drone, drawn here, on an empty comp. CANVAS_FX.wiggle at its
   defaults (Amount 40 px, Speed 2 Hz, Roughness 1, Pattern 0): dx = Amount x wnoise(2t), dy = Amount x wnoise(2t + 100), wnoise =
   .5 sin(2 pi u) + .3 sin(14.77 u + 1.3) + .2 sin(28.6 u + 2.7). Its two upper waves run here at 14.66 and 28.62 (under 1 % off) so
   the walk repeats every 4.5 s; measured against the app's own render it lands within 2 px for the first second and keeps the same
   reach after. The dashed square is +-40 px, the furthest wnoise can reach; the cross is where the layer sits; teal is its anchor. */
{ id:'wiggle', name:'Wiggle', section:'Shakes / Movement', isNew:true, still:.9,
  line:'The layer wanders smoothly and at random around where it sits, never further than the Amount.',
  make(px){
    const P=4.5, SPD=2, ZM=3.5, A=40/10.8*ZM, RX=50, RY=48, DS=1.95, k=px/100, K2=TAU*21/9, K3=TAU*41/9;
    /* wnoise(u) and wnoise(u + 100), the + 100 kept as the app's own phases so the walk starts where the app's does */
    const wx=u=>Math.sin(u*TAU)*.5+Math.sin(u*K2+1.3)*.3+Math.sin(u*K3+2.7)*.2;
    const wy=u=>Math.sin(u*TAU+628.3)*.5+Math.sin(u*K2+1477+1.3)*.3+Math.sin(u*K3+2860+2.7)*.2;
    const at=t=>{ const u=mod(t,P)*SPD; return [RX+A*wx(u),RY+A*wy(u)]; };
    /* the drone, centre at 0,0, drawn DS times its sketch size */
    const kd=k*DS, [D,d]=sheet(44*kd,19*kd); d.setTransform(kd,0,0,kd,22*kd,7.5*kd);
    const disc=(x,y,rx,ry)=>{ d.fillStyle='rgba(231,226,213,.2)'; d.beginPath(); d.ellipse(x,y,rx,ry,0,0,TAU); d.fill(); d.strokeStyle='rgba(231,226,213,.5)'; d.lineWidth=.35; d.stroke(); };
    disc(-9.6,-4.3,6.2,1.05); disc(9.6,-4.3,6.2,1.05);
    d.strokeStyle='#8f897d'; d.lineWidth=1.1; d.beginPath(); d.moveTo(-3,-1.4); d.lineTo(-9.6,-3.4); d.moveTo(3,-1.4); d.lineTo(9.6,-3.4); d.stroke();
    d.fillStyle='#4a463f'; d.fillRect(-10.4,-4.1,1.6,1.4); d.fillRect(8.8,-4.1,1.6,1.4);
    d.strokeStyle='#b9b3a6'; d.lineWidth=.7; d.lineCap='round'; d.beginPath(); d.moveTo(-3.2,2.4); d.lineTo(-5.8,8.2); d.moveTo(3.2,2.4); d.lineTo(5.8,8.2); d.moveTo(-8.2,8.4); d.lineTo(-3.6,8.4); d.moveTo(3.6,8.4); d.lineTo(8.2,8.4); d.stroke();
    d.fillStyle=BONE; d.beginPath(); d.moveTo(-7.2,1); d.bezierCurveTo(-6.8,-2.4,-4.4,-3.1,0,-3.1); d.bezierCurveTo(4.4,-3.1,6.8,-2.4,7.2,1); d.bezierCurveTo(5.2,3.6,-5.2,3.6,-7.2,1); d.fill();
    d.save(); d.clip(); d.fillStyle='#aaa396'; d.fillRect(-8,.9,16,4); d.fillStyle='rgba(255,255,255,.35)'; d.beginPath(); d.ellipse(-2.4,-2.1,3.4,.8,-.08,0,TAU); d.fill(); d.restore();
    d.fillStyle='#2a2722'; d.fillRect(-2.4,-.6,4.8,1);
    d.fillStyle='#57534b'; d.fillRect(-.6,2.6,1.2,1.4);
    d.fillStyle=INK; d.beginPath(); d.arc(0,5.1,1.9,0,TAU); d.fill(); d.fillStyle='#3d3933'; d.beginPath(); d.arc(0,5.2,1.05,0,TAU); d.fill(); d.fillStyle=BONE; d.beginPath(); d.arc(-.4,4.8,.35,0,TAU); d.fill();
    d.strokeStyle='#d6d0c3'; d.lineWidth=1.5; d.lineCap='butt'; d.beginPath(); d.moveTo(-5,.6); d.lineTo(-13,1.4); d.moveTo(5,.6); d.lineTo(13,1.4); d.stroke();
    d.fillStyle='#4a463f'; d.fillRect(-14,.1,2,2); d.fillRect(12,.1,2,2);
    d.fillStyle=VERM; d.fillRect(-13.6,2.1,1.2,.6); d.fillRect(12.4,2.1,1.2,.6);
    disc(-13,-.3,7.4,1.3); disc(13,-.3,7.4,1.3);
    return (c,t)=>{
      reset(c,px);
      c.fillStyle=NAVY; c.fillRect(0,0,100,100);
      const q=at(t);
      c.drawImage(D,q[0]-22*DS,q[1]-7.5*DS,44*DS,19*DS);
      /* reach: +-Amount round the rest place, and the rest place itself */
      c.strokeStyle=DIM; c.lineWidth=.5; c.setLineDash([1.4,1.2]); c.strokeRect(RX-A,RY-A,2*A,2*A); c.setLineDash([]);
      c.beginPath(); c.moveTo(RX-2,RY); c.lineTo(RX+2,RY); c.moveTo(RX,RY-2); c.lineTo(RX,RY+2); c.stroke();
      c.fillStyle=TEAL; c.fillRect(q[0]-1.2,q[1]-1.2,2.4,2.4);
      tab(c,3,3,'350%',4.4,HAIR,TEXT);
      c.font=MONO(4.2); c.fillStyle=DIM; c.textAlign='left'; c.textBaseline='middle';
      c.fillText('AMOUNT 40 PX  SPEED 2 HZ',4,93.5);
    };
  } },

/* CIRCLE ARRAY. A dining table from straight above, painted here: one shell chair is the layer, the walnut table another layer over it.
   caCopies at Radius 30 % (the default), Start angle 0, Face centre On, Original Hidden: copy k sits at (cx + R sin th, cy - R cos th),
   turned th, th = k x 360 / Copies. Copies steps 2, 3, 4, 6, 8 on hard cuts, as a keyframed whole number does. The chair's soft
   shadow is under it and round, so it turns with each copy without lying about the light. */
{ id:'circlearray', name:'Circle Array', section:'Repetition', isNew:true, still:3.2,
  line:'Copies of the layer stand evenly round a circle, each turned to face the middle; change Copies and they re-space.',
  make(px){
    const P=5, CX=51, CY=50, R=30, TR=24.5, k=px/100, h=Math.max(150,Math.round(px/2));
    /* the floor: warm concrete, one soft light from the upper left */
    const FL=paint(h,h,(x,y,o)=>{ const X=x/h*100, Y=y/h*100, n=fbm(X*.06,Y*.06,7,3), g=n2(X*1.3,Y*1.3,9), sp=ih(x*7919+y*104729+11);
      const l=140+(n-.5)*14+(g-.5)*6+(sp-.5)*9+(sp>.985?-22:0)+(1-(X+Y)/200)*14; o[0]=l+3; o[1]=l-1; o[2]=l-7; });
    /* the chair: a shell seat from above, back to the top, its feet just showing, a round contact shadow */
    const [CH,ch]=sheet(22*k,22*k); ch.setTransform(k,0,0,k,11*k,11*k);
    const sh=ch.createRadialGradient(0,.5,2,0,.5,10.2); sh.addColorStop(0,'rgba(20,16,12,.42)'); sh.addColorStop(.62,'rgba(20,16,12,.2)'); sh.addColorStop(1,'rgba(20,16,12,0)');
    ch.fillStyle=sh; ch.beginPath(); ch.arc(0,.5,10.2,0,TAU); ch.fill();
    ch.fillStyle='#7a5a3c'; for(const [fx,fy] of [[-6.4,5.6],[6.4,5.6],[-6.8,-5.2],[6.8,-5.2]]){ ch.beginPath(); ch.arc(fx,fy,.75,0,TAU); ch.fill(); }
    const shell=()=>{ ch.beginPath(); ch.moveTo(-6.3,4.2); ch.quadraticCurveTo(0,6.6,6.3,4.2); ch.bezierCurveTo(7.2,1.5,7.3,-2.6,6.6,-4.4); ch.bezierCurveTo(4.6,-8.2,-4.6,-8.2,-6.6,-4.4); ch.bezierCurveTo(-7.3,-2.6,-7.2,1.5,-6.3,4.2); ch.closePath(); };
    shell(); ch.fillStyle='#e9e4da'; ch.fill();
    ch.save(); shell(); ch.clip();
    const pan=ch.createRadialGradient(0,1.4,1,0,1.4,7); pan.addColorStop(0,'rgba(120,110,95,.22)'); pan.addColorStop(1,'rgba(120,110,95,0)'); ch.fillStyle=pan; ch.fillRect(-8,-9,16,16);
    ch.strokeStyle='rgba(110,100,86,.45)'; ch.lineWidth=.7; ch.beginPath(); ch.moveTo(-5.4,-2.6); ch.bezierCurveTo(-3.6,-5.6,3.6,-5.6,5.4,-2.6); ch.stroke();
    ch.strokeStyle='rgba(255,255,255,.7)'; ch.lineWidth=.5; ch.beginPath(); ch.moveTo(-6,-4.6); ch.bezierCurveTo(-4,-7.6,4,-7.6,6,-4.6); ch.stroke();
    ch.restore();
    shell(); ch.strokeStyle='rgba(90,80,68,.5)'; ch.lineWidth=.3; ch.stroke();
    /* the table: walnut, a white bowl off centre, its own shadow */
    const TS=Math.ceil(2*(TR+6)*k), [TB,tb]=sheet(TS,TS); const o2=TS/2;
    tb.setTransform(k,0,0,k,o2,o2);
    const ts=tb.createRadialGradient(.8,1.2,TR-3,.8,1.2,TR+3.6); ts.addColorStop(0,'rgba(18,14,10,.55)'); ts.addColorStop(1,'rgba(18,14,10,0)');
    tb.fillStyle=ts; tb.beginPath(); tb.arc(.8,1.2,TR+3.6,0,TAU); tb.fill();
    const WD=paint(Math.ceil(2*TR*k),Math.ceil(2*TR*k),(x,y,o)=>{ const X=x/k-TR, Y=y/k-TR, w=fbm(X*.05,Y*.35,3,3), ring=Math.sin((Y+w*9+X*.04)*1.35)*.5+.5, f=.35+.4*ring+.25*n2(X*.6,Y*4,5);
      const lit=1+(-X-Y)/TR*.07; o[0]=(62+f*58)*lit; o[1]=(38+f*36)*lit; o[2]=(24+f*22)*lit; });
    tb.save(); tb.beginPath(); tb.arc(0,0,TR,0,TAU); tb.clip(); tb.drawImage(WD,-TR,-TR,2*TR,2*TR);
    const rim=tb.createRadialGradient(0,0,TR-1.4,0,0,TR); rim.addColorStop(0,'rgba(0,0,0,0)'); rim.addColorStop(1,'rgba(0,0,0,.35)'); tb.fillStyle=rim; tb.fillRect(-TR,-TR,2*TR,2*TR); tb.restore();
    tb.strokeStyle='rgba(255,230,200,.25)'; tb.lineWidth=.5; tb.beginPath(); tb.arc(0,0,TR-.3,Math.PI*.95,Math.PI*1.55); tb.stroke();
    const bx=6.5, by=-5.5;
    const bs=tb.createRadialGradient(bx+.8,by+1.1,3.4,bx+.8,by+1.1,6.2); bs.addColorStop(0,'rgba(15,10,6,.45)'); bs.addColorStop(1,'rgba(15,10,6,0)'); tb.fillStyle=bs; tb.beginPath(); tb.arc(bx+.8,by+1.1,6.2,0,TAU); tb.fill();
    tb.fillStyle='#efeae1'; tb.beginPath(); tb.arc(bx,by,4.6,0,TAU); tb.fill();
    const bi=tb.createRadialGradient(bx-.9,by-.9,.4,bx,by,3.7); bi.addColorStop(0,'#f6f3ee'); bi.addColorStop(.7,'#d7d1c6'); bi.addColorStop(1,'#bfb8ab'); tb.fillStyle=bi; tb.beginPath(); tb.arc(bx,by,3.6,0,TAU); tb.fill();
    const steps=[[0,2],[.75,3],[1.35,4],[1.95,6],[2.55,8],[4.4,2]];
    return (c,t)=>{
      const u=mod(t,P); let n=2; for(const s of steps) if(u>=s[0]) n=s[1];
      reset(c,px); c.drawImage(FL,0,0,100,100);
      for(let i=0;i<n;i++){ const th=i*TAU/n; c.setTransform(k,0,0,k,0,0); c.translate(CX+R*Math.sin(th),CY-R*Math.cos(th)); c.rotate(th); c.drawImage(CH,-11,-11,22,22); }
      c.setTransform(1,0,0,1,0,0); c.drawImage(TB,Math.round(CX*k-o2),Math.round(CY*k-o2));
      reset(c,px); tab(c,3,92,'COPIES '+n,4.4,INK,BONE);
    };
  } },

/* TRAIL. Pen plotter: a square drawn in ink on bone is the layer. CANVAS_FX.linearrepeat with Direction 315 (up and to the right),
   Spacing 12 % of the square's own reach along that line, Copy size 92 %, Copy tint 100 % toward vermilion: copy k sits k steps
   along, at .92^k of the size (its line too), turned k x Copy turn, and is tinted k / (Copies - 1) of the way to the Tint colour
   (trailTint966's source-atop fill). Copies steps 1 to 10, then Copy turn travels from +6 to -6 degrees. */
{ id:'linearrepeat', name:'Trail', section:'Repetition', isNew:true, still:2.1,
  line:'Copies of the layer step away in a straight line; each one can be smaller, turned further and tinted more than the last.',
  make(px){
    /* bb: the box the kernel is handed is the fast alpha scan's, measured at 364 px for this 335 px square (+ its start dot) */
    const P=5.2, S=30, LW=1.3, CX=33, CY=67, ANG=315*TAU/360, k=px/100, bb=34, along=(Math.abs(Math.cos(ANG))+Math.abs(Math.sin(ANG)))*bb, STEP=along*.12;
    const PAPER=paint(Math.max(150,Math.round(px/2)),Math.max(150,Math.round(px/2)),(x,y,o)=>{ const g=n2(x*.9,y*.9,3), f=n2(x*.05,y*.05,8); const l=(g-.5)*7+(f-.5)*6; o[0]=231+l; o[1]=226+l; o[2]=213+l; });
    const VR=hex(VERM), IK=hex(INK);
    const copiesAt=u=>u<.55?1:u<1.65?Math.min(10,1+Math.floor((u-.55)/1.1*10)):u<4.6?10:1;
    const turnAt=u=>u<2.45?6:u<3.7?lerp(6,-6,E.inOut(seg(u,2.45,3.7))):u<4.6?-6:6;
    return (c,t)=>{
      const u=mod(t,P), n=copiesAt(u), turn=turnAt(u);
      reset(c,px); c.drawImage(PAPER,0,0,100,100);
      for(let q=0;q<n;q++){
        const a=n>1?q/(n-1):0, s=Math.pow(.92,q), x=CX+Math.cos(ANG)*STEP*q, y=CY+Math.sin(ANG)*STEP*q;
        const col='rgb('+Math.round(lerp(IK[0],VR[0],a))+','+Math.round(lerp(IK[1],VR[1],a))+','+Math.round(lerp(IK[2],VR[2],a))+')';
        c.setTransform(k,0,0,k,0,0); c.translate(x,y); c.rotate(q*turn*TAU/360); c.scale(s,s);
        c.strokeStyle=col; c.lineWidth=LW; c.lineJoin='miter'; c.strokeRect(-S/2,-S/2,S,S);
        c.fillStyle=col; c.beginPath(); c.arc(-S/2,-S/2,.95,0,TAU); c.fill();
      }
      reset(c,px);
      c.font=MONO(4.2); c.fillStyle=INK; c.textBaseline='middle'; c.textAlign='left';
      c.fillText('COPIES '+String(n).padStart(2,' ')+'  TURN '+(turn>=0?'+':'-')+Math.abs(turn).toFixed(0)+'°',4,94);
      c.textAlign='right'; c.fillText('FIG. 7',96,6);
    };
  } },

/* TILES. Graded still: one lit window in a dark rendered wall at night, painted here, is the clip; it sits low and to the left of
   the frame. CANVAS_FX.tiles at its defaults: Extend, Mirror On, Gap 0, Fills All round. The clip stays exactly where it is, at
   full size, and copies of its box step out in every direction, every other column flipped left to right and every other row
   upside down, so the edges meet. Off, then On, then Fade copies 45 %, which lays each ring of copies (1 - .45)^ring as strong,
   so you can find the clip. The corner marks are the clip's box. */
{ id:'tiles', name:'Tiles', section:'Repetition', isNew:true, still:2.0,
  line:'Copies of the clip spread out from where it sits until they fill the frame, every other one flipped so the edges join.',
  make(px){
    const P=4.8, k=px/100, CW=30, CH=34, CX0=13, CY0=42;
    const cw=Math.round(CW*k), ch=Math.round(CH*k);
    /* the wall: dark render, weathered, the window cut in it */
    const WALL=paint(cw,ch,(x,y,o)=>{ const X=x/cw*CW, Y=y/ch*CH, n=fbm(X*.35,Y*.35,51,3), s=n2(X*1.4,Y*.12,53), g=ih(x*7919+y*104729+7);
      const l=44+(n-.5)*12+(s-.5)*7+(g-.5)*6; o[0]=l+2; o[1]=l; o[2]=l-3; });
    const [CL,cl]=sheet(cw,ch); cl.drawImage(WALL,0,0); cl.setTransform(k,0,0,k,0,0);
    const WX=6, WY=4.5, WW=18, WH=23;
    /* the room: one lamp up on the left, a picture on the back wall */
    const rm=cl.createRadialGradient(WX+3.5,WY+4.5,.5,WX+5,WY+7,WW*1.1); rm.addColorStop(0,'#f1c98e'); rm.addColorStop(.35,'#c58a52'); rm.addColorStop(1,'#4f3220');
    cl.fillStyle=rm; cl.fillRect(WX,WY,WW,WH);
    cl.fillStyle='rgba(40,24,14,.55)'; cl.fillRect(WX+9.5,WY+6.2,5,4); cl.fillStyle='rgba(205,170,120,.35)'; cl.fillRect(WX+10.1,WY+6.8,3.8,2.8);
    cl.fillStyle='#ffe6bd'; poly(cl,[WX+2.2,WY+3.2, WX+5.2,WY+3.2, WX+5.9,WY+5.6, WX+1.5,WY+5.6]); cl.fill();
    cl.fillStyle='rgba(40,26,16,.7)'; cl.fillRect(WX+3.55,WY+5.6,.3,8);
    /* the curtain, gathered on the right */
    for(let i=0;i<6;i++){ const x=WX+WW-6+i, sh=i%2?'#28463f':'#36605a'; cl.fillStyle=sh; poly(cl,[x,WY, x+1.05,WY, x+1.25+.2*Math.sin(i),WY+WH, x-.15,WY+WH]); cl.fill(); }
    cl.fillStyle='rgba(255,210,150,.25)'; cl.fillRect(WX+WW-6.2,WY,.35,WH);
    /* a plant on the sill, against the light */
    cl.fillStyle='#16201a'; for(const [a,l,w] of [[-1.9,7.5,1.3],[-1.45,8.6,1.4],[-1.1,7.2,1.2],[-2.3,6.2,1.1],[-.8,5.6,1.1]]){ const bx=WX+4.2, by=WY+WH-3.1; cl.beginPath(); cl.ellipse(bx+Math.cos(a)*l*.5,by+Math.sin(a)*l*.5,l*.5,w*.5,a,0,TAU); cl.fill(); }
    cl.fillStyle='#7d4630'; poly(cl,[WX+2.5,WY+WH-3.2, WX+6,WY+WH-3.2, WX+5.5,WY+WH, WX+3,WY+WH]); cl.fill();
    /* the frame, its cross bars, the reveal and the sill */
    cl.fillStyle='rgba(0,0,0,.45)'; cl.fillRect(WX,WY,WW,.7); cl.fillRect(WX,WY,.7,WH);
    cl.strokeStyle='#b9b4a9'; cl.lineWidth=.6; cl.strokeRect(WX+.3,WY+.3,WW-.6,WH-.6); cl.beginPath(); cl.moveTo(WX+WW/2,WY); cl.lineTo(WX+WW/2,WY+WH); cl.moveTo(WX,WY+8.2); cl.lineTo(WX+WW,WY+8.2); cl.stroke();
    cl.fillStyle='rgba(255,255,255,.06)'; poly(cl,[WX+1,WY+WH, WX+7,WY, WX+10,WY, WX+4,WY+WH]); cl.fill();
    cl.fillStyle='#8e8a82'; cl.fillRect(WX-1.2,WY+WH,WW+2.4,1.6); cl.fillStyle='#c9b49a'; cl.fillRect(WX-1.2,WY+WH,WW+2.4,.4); cl.fillStyle='rgba(0,0,0,.4)'; cl.fillRect(WX-.6,WY+WH+1.6,WW+1.2,1.1);
    cl.setTransform(1,0,0,1,0,0);
    const fadeAt=u=>u<2.6?0:u<3.2?.45*E.inOut(seg(u,2.6,3.2)):.45;
    return (c,t)=>{
      const u=mod(t,P), on=u>=1&&u<4.2, fd=fadeAt(u);
      reset(c,px); c.fillStyle='#000'; c.fillRect(0,0,100,100);
      if(on){ const sx=CW-.1, sy=CH-.1;
        for(let j=-2;j<=1;j++) for(let i=-1;i<=2;i++){ if(!i&&!j) continue; const x=CX0+i*sx, y=CY0+j*sy, a=Math.pow(1-fd,Math.max(Math.abs(i),Math.abs(j))), fx=(i&1)!==0, fy=(j&1)!==0;
          c.globalAlpha=a; c.setTransform(fx?-k:k,0,0,fy?-k:k,(fx?x+CW:x)*k,(fy?y+CH:y)*k); c.drawImage(CL,0,0,cw,ch,0,0,CW,CH); }
        reset(c,px); }
      c.drawImage(CL,0,0,cw,ch,CX0,CY0,CW,CH);
      c.strokeStyle=BONE; c.lineWidth=.55;
      for(const [x,y,dx,dy] of [[CX0,CY0,1,1],[CX0+CW,CY0,-1,1],[CX0,CY0+CH,1,-1],[CX0+CW,CY0+CH,-1,-1]]){ c.beginPath(); c.moveTo(x+dx*3,y); c.lineTo(x,y); c.lineTo(x,y+dy*3); c.stroke(); }
      tab(c,3,92,on?'MIRROR ON  FADE '+Math.round(fd*100)+'%':'TILES OFF',4.2,'#22201c',BONE);
    };
  } },

/* CHUNK NOISE. Broadcast bench: a motorway camera, painted here (left-hand traffic going away, overcast). PIXEL_FX.blocknoise exactly:
   every block of Block size x (Block size x Aspect) px gets a grey G from the kernel's own integer hash of (block x, block y, frame),
   frame = floor(t x Speed), and the pixel becomes pixel x (1 - .6 Amount) + G x .6 Amount. Block size 40 px, Aspect .5, Speed 8 Hz
   (the default), Amount .6 when the signal drops, 0 when it is clean. The noise is drawn as a 27 x 54 grid of those greys at .36. */
{ id:'blocknoise', name:'Chunk Noise', section:'Generative', isNew:true, still:1.5,
  line:'Rough grey blocks flicker over the picture, as if the signal were breaking up.',
  make(px){
    const P=4, k=px/100, HZ=31, VPX=40, F=34, G=68, ZC=13, HAZE=[166,169,166];
    const sxz=(X,z)=>VPX+F*X/z, syz=z=>HZ+G/z, YC=HZ+G/ZC;
    const hz=(r,g,bb,m)=>'rgb('+Math.round(lerp(r,HAZE[0],m))+','+Math.round(lerp(g,HAZE[1],m))+','+Math.round(lerp(bb,HAZE[2],m))+')';
    /* the picture without traffic: the carriageway runs up to a crest, the country beyond it */
    const [BG,b]=sheet(px); b.setTransform(k,0,0,k,0,0);
    const sk=b.createLinearGradient(0,0,0,HZ); sk.addColorStop(0,'#bcbfbd'); sk.addColorStop(1,'#d2d4d0'); b.fillStyle=sk; b.fillRect(0,0,100,HZ+.2);
    b.fillStyle=hz(112,120,100,.45); b.fillRect(0,HZ,100,YC-HZ+.5);
    b.fillStyle=hz(80,88,74,.5); b.beginPath(); b.moveTo(0,HZ+.4); for(let x=0;x<=100;x++) b.lineTo(x,HZ-.6-1.8*fbm(x*.11,0,5,3)); b.lineTo(100,HZ+.4); b.closePath(); b.fill();
    for(let i=0;i<9;i++){ const x=8+i*11+6*n2(i*3.1,0,9), y=HZ+1.2+2.6*n2(i*1.7,2,9), r=.9+1.4*n2(i*2.3,4,9); b.fillStyle=hz(70,80,64,.42); b.beginPath(); b.ellipse(x,y,r*1.6,r*.8,0,0,TAU); b.fill(); }
    const zs=[]; for(let z=.6;z<ZC;z*=1.03) zs.push(z); zs.push(ZC);
    const band=(X0,X1,col)=>{ const A=hex(col); for(let i=0;i<zs.length-1;i++){ const z0=zs[i], z1=zs[i+1];
        b.fillStyle=hz(A[0],A[1],A[2],clamp(z0/38)); b.beginPath(); b.moveTo(sxz(X0,z0),syz(z0)); b.lineTo(sxz(X1,z0),syz(z0)); b.lineTo(sxz(X1,z1),syz(z1)-.05); b.lineTo(sxz(X0,z1),syz(z1)-.05); b.closePath(); b.fill(); } };
    band(-14,-1.6,'#6b7158'); band(2.25,3.1,'#6f7560'); band(3.1,6.8,'#636564'); band(6.8,22,'#6b7158');
    band(-1.6,2.25,'#585a59');
    const line=(X,w,on,off)=>{ for(let z=.6;z<ZC;){ const z1=on?Math.min(ZC,z+on):ZC;
        b.fillStyle=hz(214,212,202,clamp(z/38)); b.beginPath(); b.moveTo(sxz(X-w,z),syz(z)); b.lineTo(sxz(X+w,z),syz(z)); b.lineTo(sxz(X+w,z1),syz(z1)); b.lineTo(sxz(X-w,z1),syz(z1)); b.closePath(); b.fill(); z=on?z1+off:z1; } };
    line(-1,.06,0,0); line(2,.06,0,0); line(0,.05,.9,2.6); line(1,.05,.9,2.6); line(4.9,.05,.9,2.6);
    /* the median barrier, and lamp posts on the left verge */
    for(let i=0;i<zs.length-1;i++){ const z0=zs[i], z1=zs[i+1], hh=F*.22; b.fillStyle=hz(140,143,141,clamp(z0/38));
      b.beginPath(); b.moveTo(sxz(2.3,z0),syz(z0)-hh/z0); b.lineTo(sxz(2.3,z1),syz(z1)-hh/z1); b.lineTo(sxz(2.3,z1),syz(z1)); b.lineTo(sxz(2.3,z0),syz(z0)); b.closePath(); b.fill(); }
    for(let z=1.7;z<ZC;z+=3.6){ const x=sxz(-2.2,z), y=syz(z), H=F*3.0/z;
      b.strokeStyle=hz(70,74,72,clamp(z/38)); b.lineWidth=Math.max(.22,F*.05/z); b.beginPath(); b.moveTo(x,y); b.lineTo(x,y-H); b.lineTo(x+F*.7/z,y-H-F*.1/z); b.stroke(); }
    /* a little sensor grain */
    b.setTransform(1,0,0,1,0,0); const R=rng(5150), gd=Math.max(1,Math.round(px/300));
    for(let i=0;i<px*px/(gd*gd)*.08;i++){ const v=R(); b.fillStyle=v<.5?'rgba(0,0,0,.07)':'rgba(255,255,255,.07)'; b.fillRect(Math.floor(R()*px/gd)*gd,Math.floor(R()*px/gd)*gd,gd,gd); }
    /* traffic going away: z runs 0.75 to 16.5 lane widths a loop, over the crest and out of sight before it comes round */
    const CARS=[{X:-.5,ph:.02,col:'#e2e1dc',w:.64,h:.95,lorry:1},{X:-.5,ph:.36,col:'#5f6163',w:.5,h:.42},{X:-.5,ph:.70,col:'#c9cbcc',w:.56,h:.62,van:1},
      {X:.5,ph:.15,col:'#3a3e44',w:.5,h:.4},{X:.5,ph:.49,col:'#7b2b25',w:.5,h:.4},{X:.5,ph:.83,col:'#a4a9ad',w:.5,h:.42},
      {X:1.5,ph:.27,col:'#2d3a50',w:.52,h:.44},{X:1.5,ph:.61,col:'#d8d8d2',w:.5,h:.42},{X:1.5,ph:.94,col:'#1f2124',w:.52,h:.46}];
    const carAt=(C,u)=>.75+mod(C.ph+u/P,1)*15.75;
    const drawCar=(c,C,z)=>{ const m=clamp(z/38), over=z>ZC, x=sxz(C.X,z), y=over?YC+(z-ZC)*.9:syz(z), w=F*C.w/z, hgt=F*C.h/z; if(y-hgt>103) return;
      const A=hex(C.col);
      if(over){ c.save(); c.beginPath(); c.rect(0,0,100,YC); c.clip(); }
      c.fillStyle=hz(30,31,31,m); c.fillRect(x-w*.52,y-hgt*.08,w*1.04,hgt*.12);
      c.fillStyle=hz(A[0],A[1],A[2],m); c.fillRect(x-w/2,y-hgt,w,hgt*.94);
      if(C.lorry){ c.fillStyle=hz(150,150,146,m); c.fillRect(x-w*.015,y-hgt*.94,w*.03,hgt*.74); c.fillStyle=hz(48,48,48,m); c.fillRect(x-w/2,y-hgt*.2,w,hgt*.1);
        c.fillStyle=hz(150,34,28,m); c.fillRect(x-w*.46,y-hgt*.27,w*.12,hgt*.06); c.fillRect(x+w*.34,y-hgt*.27,w*.12,hgt*.06); }
      else { c.fillStyle=hz(34,38,42,m); c.fillRect(x-w*.38,y-hgt*.92,w*.76,hgt*(C.van?.26:.36));
        c.fillStyle=hz(176,36,30,m); c.fillRect(x-w*.48,y-hgt*.5,w*.15,hgt*.11); c.fillRect(x+w*.33,y-hgt*.5,w*.15,hgt*.11);
        c.fillStyle=hz(60,62,64,m); c.fillRect(x-w*.18,y-hgt*.34,w*.36,hgt*.09); }
      if(over) c.restore(); };
    /* the noise, exactly the kernel's hash */
    const BS=40, ASP=.5, SPD=8, NX=Math.ceil(1080/BS), NY=Math.ceil(1080/(BS*ASP)), NF=P*SPD, NZ=[];
    for(let f=0;f<NF;f++){ const [C,x]=sheet(NX,NY), im=x.createImageData(NX,NY), d=im.data;
      for(let by=0;by<NY;by++) for(let bx=0;bx<NX;bx++){ let h=(bx*374761393+by*668265263+f*2147483647)|0; h=(h^(h>>>13))*1274126177|0; h=h^(h>>>16); const g=(h>>>0)&255, j=(by*NX+bx)*4; d[j]=d[j+1]=d[j+2]=g; d[j+3]=255; }
      x.putImageData(im,0,0); NZ.push(C); }
    const amtAt=u=>(u>=.75&&u<2.45)||(u>=2.8&&u<3.3)?.6:0;
    return (c,t)=>{
      const u=mod(t,P), amt=amtAt(u);
      reset(c,px); c.drawImage(BG,0,0,100,100);
      const L=CARS.map(C=>[C,carAt(C,u)]).sort((p,q)=>q[1]-p[1]);
      for(const [C,z] of L) drawCar(c,C,z);
      if(amt>0){ c.imageSmoothingEnabled=false; c.globalAlpha=amt*.6; c.drawImage(NZ[Math.floor(u*SPD)%NF],0,0,NX*BS/10.8,NY*BS*ASP/10.8); c.globalAlpha=1; c.imageSmoothingEnabled=true; }
      tab(c,3,3,'AMOUNT '+amt.toFixed(2),4.4,'#000',TEXT);
    };
  } }

);
})();
