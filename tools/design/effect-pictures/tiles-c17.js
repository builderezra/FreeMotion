/* FreeMotion effect pictures, artist 17 (c17): Warping, Taffy Pull to Wave.
   No photographs. Every subject is drawn here, and every change is the effect's own map from js/compositor.js (WARP_FX),
   at an ordinary setting, applied to those pixels. Each tile's note names the kernel and the numbers. */
(function(){ 'use strict';
const {TAU,clamp,lerp,seg,E,rng}=window.FXK;

const BONE='#e7e2d5', INK='#16130f', COAL='#0c0c0d', TEXT='#eef2f8', VERM='#e4471d', TEAL='#29d9bb', YEL='#ffce4a', PAPER='#d9d4c6';
const MONO=s=>'bold '+s+'px "Courier Prime","Courier New",monospace';
const SANS=s=>'800 '+s+'px "Helvetica Neue",Helvetica,Arial,"Segoe UI",system-ui,sans-serif';
const mod=(t,P)=>((t%P)+P)%P;
const reset=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; };
const raw=c=>{ c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; };
const sheet=(w,h)=>{ const C=document.createElement('canvas'); C.width=w; C.height=h===undefined?w:h; return [C,C.getContext('2d')]; };
/* damped settle: 0 to 1 with one overshoot */
const settle=p=>p<=0?0:p>=1?1:1-Math.pow(2,-8.5*p)*Math.cos(p*9.5);
function tab(c,x,y,txt,s,bg,fg){ c.font=MONO(s); const w=c.measureText(txt).width; c.fillStyle=bg; c.fillRect(x,y,w+s*.9,s*1.5); c.fillStyle=fg; c.textBaseline='middle'; c.textAlign='left'; c.fillText(txt,x+s*.45,y+s*.8); return w+s*.9; }
function poly(c,p){ c.beginPath(); for(let i=0;i<p.length;i+=2){ if(i) c.lineTo(p[i],p[i+1]); else c.moveTo(p[i],p[i+1]); } c.closePath(); }
/* bilinear read of an RGBA array with the frame edge held (Edges: Stretch) */
function sampleInto(o,j,s,W,H,x,y){
  if(x<0) x=0; else if(x>W-1) x=W-1; if(y<0) y=0; else if(y>H-1) y=H-1;
  const ix=x|0, iy=y|0, fx=x-ix, fy=y-iy, ix1=ix<W-1?ix+1:ix, iy1=iy<H-1?iy+1:iy;
  const a=(iy*W+ix)*4, b=(iy*W+ix1)*4, c=(iy1*W+ix)*4, d=(iy1*W+ix1)*4;
  for(let q=0;q<3;q++) o[j+q]=(s[a+q]*(1-fx)+s[b+q]*fx)*(1-fy)+(s[c+q]*(1-fx)+s[d+q]*fx)*fy;
  o[j+3]=255;
}

window.FX_TILES.push(

/* TAFFY PULL. Broadcast bench: a test card on true black, rulers down both edges. WARP_FX.stretchseg, Position 50, Band 25, Stretch
   keyed 0 to .6, Edge softness 0. The map is piecewise linear in y, so scaled strips draw it exactly: the band shows the middle 40% of
   itself (the 75% bars, 45..55) pulled to fill 37.5..62.5, over the rows just outside it.
   WHY SOFTNESS 0: a new instance defaults to Edge softness 10, but stretchseg.glsl (the WebGL twin, which his phone and PC run) has no
   softness term, so the app shows a hard edge whatever the slider says (measured: GPU at 10 == GPU at 0 == CPU at 0; CPU at 10 squeezes
   the margins). 0 is the one setting both paths draw the same. Worth a fix in compositor.js. */
{ id:'stretchseg', name:'Taffy Pull', section:'Warping', isNew:true, still:2.2,
  line:'A band across the middle is stretched taller, over the rows just above and below it.',
  make(px){
    const P=4.4, CY=50, HALF=12.5, SOFT=0, AMT=.6, k=px/100;
    const [S,s]=sheet(px); s.setTransform(k,0,0,k,0,0);
    s.fillStyle='#000'; s.fillRect(0,0,100,100);
    /* rulers down both edges: the ticks spread where the band is pulled */
    s.fillStyle='#e8e8e8';
    for(let i=0;i<=40;i++){ const y=i*2.5, L=i%5===0?7:3.2, w=i%5===0?.75:.5; s.fillRect(0,y-w/2,L,w); s.fillRect(100-L,y-w/2,L,w); }
    const R=40;
    s.save(); s.beginPath(); s.arc(50,50,R,0,TAU); s.fillStyle='#000'; s.fill(); s.clip();
    /* castellations */
    for(let i=0;i<10;i++){ s.fillStyle=(i&1)?'#000':'#c4c4c4'; s.fillRect(25+i*5,13.5,5,6.5); }
    /* six grey steps */
    [18,58,98,138,178,218].forEach((g,i)=>{ s.fillStyle='rgb('+g+','+g+','+g+')'; s.fillRect(14+i*12,27.5,12.05,11); });
    /* 75% colour bars */
    ['#bfbfbf','#bfbf00','#00bfbf','#00bf00','#bf00bf','#bf0000','#0000bf'].forEach((b,i)=>{ s.fillStyle=b; s.fillRect(10+i*80/7,45,80/7+.06,10); });
    /* a frequency grating, finer to the right */
    s.fillStyle='#e8e8e8'; let gx=17; for(const w of [2.2,2.2,2.2,1.5,1.5,1.5,1.5,1,1,1,1,1,.7,.7,.7,.7,.7,.7]){ s.fillRect(gx,61,w,10); gx+=2*w; }
    /* the card's name box */
    s.fillStyle='#e8e8e8'; s.fillRect(36,75,28,8); s.fillStyle='#000'; s.font=MONO(6); s.textAlign='center'; s.textBaseline='middle'; s.fillText('FM 1080',50,79.3);
    s.restore();
    s.strokeStyle=TEXT; s.lineWidth=1.4; s.beginPath(); s.arc(50,50,R,0,TAU); s.stroke();
    /* the centre ring: a circle that only stays a circle while nothing is pulled */
    s.strokeStyle='#fff'; s.lineWidth=.9; s.beginPath(); s.arc(50,50,3.4,0,TAU); s.stroke();
    /* the kernel's map is linear on each of five rows of the frame; each strip carries its own [output range, source range],
       so a rounded strip edge never reads across the tear at the band's edge */
    const strips=a=>{ const f=1-a; return [[0,CY-HALF-SOFT,0,CY-HALF-SOFT],[CY-HALF-SOFT,CY-HALF,CY-HALF-SOFT,CY-HALF*f],[CY-HALF,CY+HALF,CY-HALF*f,CY+HALF*f],
      [CY+HALF,CY+HALF+SOFT,CY+HALF*f,CY+HALF+SOFT],[CY+HALF+SOFT,100,CY+HALF+SOFT,100]]; };
    return (c,t)=>{
      const u=mod(t,P);
      const a=u<.6?0:u<3.2?AMT*settle(seg(u,.6,1.5)):u<3.85?AMT*(1-E.inOut(seg(u,3.2,3.85))):0;
      raw(c);
      if(a<.002){ c.drawImage(S,0,0); return; }
      for(const [Y0,Y1,S0,S1] of strips(a)){ if(Y1-Y0<1e-6) continue; const y0=Math.round(Y0*k), y1=Math.round(Y1*k); if(y1<=y0) continue;
        const m=(S1-S0)/(Y1-Y0), s0=(S0+(y0/k-Y0)*m)*k, s1=(S0+(y1/k-Y0)*m)*k;
        c.drawImage(S,0,clamp(s0,0,px),px,Math.max(.01,Math.min(px,s1)-clamp(s0,0,px)),0,y0,px,y1-y0); }
    };
  } },

/* TILE SPIN. Two-ink print: ink rules on bone and one undisturbed vermilion disc. WARP_FX.tilerotate, Tile 180 on a 1080 frame
   (six tiles a side), each tile's content turned about its own centre, the checker sign alternating. The kernel reads past
   its tile, so each tile is the whole plate turned and clipped; the plate's edge is held (Edges: Stretch). Angle 0, 45, 90. */
{ id:'tilerotate', name:'Tile Spin', section:'Warping', isNew:true, still:1.9,
  line:'The picture is cut into square tiles and each one turns on its own centre, every other tile the opposite way.',
  make(px){
    const P=5, k=px/100, N=6, TS=100/N;
    const [S,s]=sheet(px); s.setTransform(k,0,0,k,0,0);
    s.fillStyle=BONE; s.fillRect(0,0,100,100);
    s.fillStyle=INK; for(let j=0;j<=2*N;j++){ s.fillRect(0,j*TS/2-1.55,100,3.1); }
    s.fillStyle=VERM; s.beginPath(); s.arc(68,67,34,0,TAU); s.fill();
    /* paper showing through the inks */
    const r=rng(1717); s.fillStyle=BONE; for(let i=0;i<700;i++){ const x=r()*100, y=r()*100, d=.15+r()*.28; s.globalAlpha=.35+.5*r(); s.fillRect(x,y,d,d); } s.globalAlpha=1;
    /* the plate with its edge held, so a corner tile reads the edge row the way the kernel's clamp does */
    const m=Math.ceil(TS*.24*k)+2, W=px+2*m, [PD,pd]=sheet(W);
    pd.drawImage(S,m,m);
    pd.drawImage(S,0,0,1,px,0,m,m,px); pd.drawImage(S,px-1,0,1,px,m+px,m,m,px);
    pd.drawImage(S,0,0,px,1,m,0,px,m); pd.drawImage(S,0,px-1,px,1,m,m+px,px,m);
    pd.drawImage(S,0,0,1,1,0,0,m,m); pd.drawImage(S,px-1,0,1,1,m+px,0,m,m); pd.drawImage(S,0,px-1,1,1,0,m+px,m,m); pd.drawImage(S,px-1,px-1,1,1,m+px,m+px,m,m);
    const X=[]; for(let i=0;i<=N;i++) X.push(Math.round(i*TS*k));
    const ang=u=>u<.5?0:u<2.2?45*settle(seg(u,.5,1.3)):u<3.9?45+45*settle(seg(u,2.2,3.0)):u<4.6?90*(1-E.inOut(seg(u,3.9,4.6))):0;
    return (c,t)=>{
      const u=Math.floor(mod(t,P)*12)/12, deg=ang(u), a=deg*Math.PI/180;
      raw(c);
      if(Math.abs(deg)<.05) c.drawImage(S,0,0);
      else for(let j=0;j<N;j++) for(let i=0;i<N;i++){
        const sg=((i+j)&1)?-1:1, cx=(i+.5)*TS*k, cy=(j+.5)*TS*k;
        c.save(); c.beginPath(); c.rect(X[i],X[j],X[i+1]-X[i],X[j+1]-X[j]); c.clip();
        c.translate(cx,cy); c.rotate(-sg*a); c.translate(-cx,-cy); c.drawImage(PD,-m,-m); c.restore();
      }
      reset(c,px); tab(c,3,3,'ANGLE '+String(Math.round(deg)).padStart(2,'0')+'°',4.6,INK,BONE);
    };
  } },

/* BRICK SLIDE. Cut paper: a claw hammer laid across the frame, bone head and vermilion handle on ink. WARP_FX.tileshift, Tile 135 on
   a 1080 frame (eight a side), Offset keyed 0 to .5: odd rows read Offset x Tile to the right (so they slide left), odd columns read
   it below (so they slide up), and what leaves one edge comes back at the other. On threes. The hammer's long straight edges run
   across both rows and columns, so every one of them breaks into steps. (Redrawn by checker 3: the forward arrow repeated Stripes'
   yellow arrow on dark and Depth Push's arrow.) */
{ id:'tileshift', name:'Brick Slide', section:'Warping', isNew:true, still:3.25,
  line:'The picture is cut into squares, and every other row and every other column slides half a square, so straight edges break into steps.',
  make(px){
    const P=4.4, k=px/100, N=8, TS=100/N;
    const [S,s]=sheet(px); s.setTransform(k,0,0,k,0,0);
    s.fillStyle=INK; s.fillRect(0,0,100,100);
    /* the hammer in its own frame: head along x, the handle hanging down y; turned 40 degrees so the handle runs off the lower left */
    s.save(); s.translate(57,35); s.rotate(40*Math.PI/180);
    s.fillStyle=VERM; poly(s,[-3.6,4, 3.6,4, 4.6,58, 5.5,73, 4.9,80, -4.9,80, -5.5,73, -4.6,58]); s.fill();
    s.fillStyle=BONE;
    poly(s,[-25.5,-7.2, -21,-7.2, -20.4,-5.8, -6,-5.6, -6,-6.4, 6.2,-6.4, 14.4,-5.4, 21.4,-2.4, 26.6,3.4, 25.8,5.6, 19.4,2.8, 12.6,4.6, 6.2,6.4, -6,6.4, -6,5.6, -20.4,5.8, -21,7.2, -25.5,7.2]); s.fill();
    s.fillStyle=INK; poly(s,[-1.6,-6.5, 1.6,-6.5, 1.4,-4.9, -1.4,-4.9]); s.fill();   /* the wedge in the eye */
    s.restore();
    const X=[]; for(let i=0;i<=N;i++) X.push(Math.round(i*TS*k));
    return (c,t)=>{
      const u=Math.floor(mod(t,P)*8)/8;
      const off=u<.5?0:u<2.9?.5*settle(seg(u,.5,1.4)):u<3.6?.5*(1-E.inOut(seg(u,2.9,3.6))):0;
      raw(c); c.drawImage(S,0,0);
      if(off<.002) return;
      const sh=off*TS*k;
      for(let j=0;j<N;j++) for(let i=0;i<N;i++){
        const dx=(j&1)?sh:0, dy=(i&1)?sh:0; if(!dx&&!dy) continue;
        c.save(); c.beginPath(); c.rect(X[i],X[j],X[i+1]-X[i],X[j+1]-X[j]); c.clip();
        c.drawImage(S,-dx,-dy); if(dx) c.drawImage(S,px-dx,-dy); if(dy) c.drawImage(S,-dx,px-dy); if(dx&&dy) c.drawImage(S,px-dx,px-dy);
        c.restore();
      }
    };
  } },

/* TITLE WARP. Type poster with the layer's own furniture: a two-line title, ink on bone, flush left, with its box (the ink bounds the
   driver measures, alpha > 8) and corner anchors. WARP_FX.titlewarp: Shape Arc, Bend keyed 0 to 60; a hard cut to Shape Flag at
   Bend 60 with Wave speed 300 deg/s; Bend back to 0. Arc and Flag only move points up and down by an amount that depends on x, so
   one-pixel columns draw the map exactly. */
{ id:'titlewarp', name:'Title Warp', section:'Warping', isNew:true, still:1.9,
  line:'A title bends inside its own box: here it arcs up, then cuts to a flag that ripples.',
  make(px){
    const P=5, k=px/100, X0=7, BEND=.6, SPD=300*Math.PI/180;
    const [T,tx]=sheet(px); tx.setTransform(k,0,0,k,0,0);
    let FS=31; tx.font=SANS(FS); const wid=Math.max(tx.measureText('COLD').width,tx.measureText('OPEN').width); if(wid>85) FS*=85/wid;
    const Y1=17+FS*.73, Y2=Y1+FS*.9;
    tx.font=SANS(FS); tx.fillStyle=INK; tx.textAlign='left'; tx.textBaseline='alphabetic';
    tx.fillText('COLD',X0,Y1); tx.fillText('OPEN',X0,Y2);
    const m1=tx.measureText('COLD'), m2=tx.measureText('OPEN');
    const bx0=X0-Math.max(m1.actualBoundingBoxLeft,m2.actualBoundingBoxLeft), bx1=X0+Math.max(m1.actualBoundingBoxRight,m2.actualBoundingBoxRight);
    const by0=Y1-m1.actualBoundingBoxAscent, by1=Y2+m2.actualBoundingBoxDescent;
    const w=bx1-bx0, h=by1-by0, cx=(bx0+bx1)/2;
    const st=px>420?3:px>220?2:1, c0=Math.max(0,Math.floor(bx0*k)-2), c1=Math.min(px,Math.ceil(bx1*k)+2);
    return (c,t)=>{
      const u=mod(t,P), flag=u>=2.3&&u<4.6;   /* Bend is 0 from 4.6, so the shape no longer matters and the label goes back to Arc */
      const bend=u<2.3?BEND*settle(seg(u,.5,1.3)):u<4.1?BEND:BEND*(1-E.inOut(seg(u,4.1,4.6)));
      const ph=flag?(u-2.3)*SPD:0;
      reset(c,px); c.fillStyle=BONE; c.fillRect(0,0,100,100);
      /* the layer's box and its anchors */
      c.strokeStyle='#8a8476'; c.lineWidth=.5; c.strokeRect(bx0,by0,w,h);
      c.fillStyle=TEAL; for(const [ax,ay] of [[bx0,by0],[bx1,by0],[bx0,by1],[bx1,by1]]) c.fillRect(ax-1.1,ay-1.1,2.2,2.2);
      raw(c);
      if(bend<.002) c.drawImage(T,0,0);
      else for(let xd=c0;xd<c1;xd+=st){
        const x=(xd+st/2)/k, uu=(x-bx0)/w, qx=(x-cx)/(w/2);
        let D;
        if(!flag){ const xF=(qx<=-1||qx>=1)?0:1-qx*qx; D=bend*h*.5*xF; }
        else D=bend*h*(.1+.25*uu)*Math.sin(TAU*1.4*uu+ph);
        c.drawImage(T,xd,0,st,px,xd,-D*k,st,px);
      }
      reset(c,px);
      tab(c,X0,88,(flag?'FLAG ':'ARC  ')+String(Math.round(bend*100)).padStart(2,'0')+'%',5.2,INK,BONE);
    };
  } },

/* WORMHOLE. Two-ink print, vermilion and ink on bone: a street map with a river and a park, plates out of register.
   WARP_FX.tunnel at its defaults (Centre 50, 50; Mouth size 30, so R is 0.3 of the half-diagonal) with Amount keyed 0 to .5: each
   point shows the plate at radius r(1-A) + A*R^2/r, so the map beyond the mouth swells, inside the mouth it is turned inside out,
   and the very middle reads the plate's edge (Edges: Stretch). Precomputed at sixteen Amounts, bilinear. */
{ id:'tunnel', name:'Wormhole', section:'Warping', isNew:true, still:2.2,
  line:'The picture turns inside out around a round mouth: outside the mouth it swells, and inside it the outer picture is folded in toward the centre.',
  make(px){
    /* sixteen Amounts, the fourteenth exactly .5, so the long hold is one crisp level and only the moves cross-fade */
    const P=4.6, N=Math.min(280,px), VX=50, VY=50, RAD=.3*Math.hypot(50,50), R2=RAD*RAD, L=16, AMAX=.5*L/14, GRN=INK, SUN=VERM;
    const [S,s]=sheet(N); s.setTransform(N/100,0,0,N/100,0,0);
    /* the vermilion plate: blocks, with the streets, the avenue, the river banks and the park cut out of it */
    s.fillStyle=SUN; s.fillRect(0,0,100,100);
    s.strokeStyle=BONE; s.fillStyle=BONE; s.lineCap='butt';
    s.save(); s.translate(50,50); s.rotate(-12*Math.PI/180);
    s.lineWidth=2.1; s.beginPath(); for(let i=-7;i<=7;i++){ const v=i*11+3; s.moveTo(v,-80); s.lineTo(v,80); s.moveTo(-80,v); s.lineTo(80,v); } s.stroke();
    const PARK=[15.05,-28.95,34.95,-20.05]; s.fillRect(PARK[0]-1,PARK[1]-1,PARK[2]-PARK[0]+2,PARK[3]-PARK[1]+2);
    s.restore();
    s.lineWidth=3.6; s.beginPath(); s.moveTo(-5,83); s.lineTo(105,35); s.stroke();
    const RIV=[[-8,15],[12,20],[27,33],[36,50],[46,68],[56,86],[60,108]];
    const river=()=>{ s.beginPath(); s.moveTo(RIV[0][0],RIV[0][1]); for(let i=1;i<RIV.length-1;i++){ const m=[(RIV[i][0]+RIV[i+1][0])/2,(RIV[i][1]+RIV[i+1][1])/2]; s.quadraticCurveTo(RIV[i][0],RIV[i][1],m[0],m[1]); } s.lineTo(RIV[RIV.length-1][0],RIV[RIV.length-1][1]); };
    s.lineJoin='round'; s.lineCap='round'; s.lineWidth=11.5; river(); s.stroke();
    /* the ink plate, overprinted, 0.7 out of register */
    s.globalCompositeOperation='multiply'; s.save(); s.translate(.6,-.4);
    s.strokeStyle=GRN; s.lineWidth=7.2; river(); s.stroke();
    s.fillStyle=GRN; s.save(); s.translate(50,50); s.rotate(-12*Math.PI/180); s.fillRect(PARK[0],PARK[1],PARK[2]-PARK[0],PARK[3]-PARK[1]); s.restore();
    s.restore(); s.globalCompositeOperation='source-over';
    /* paper showing through the ink */
    const r=rng(2323); s.fillStyle=BONE; for(let i=0;i<650;i++){ const x=r()*100, y=r()*100, d=.15+r()*.3; s.globalAlpha=.3+.5*r(); s.fillRect(x,y,d,d); } s.globalAlpha=1;
    s.setTransform(1,0,0,1,0,0); const src=s.getImageData(0,0,N,N).data;
    /* every Amount once: out(x,y) = plate(c + (p-c)/r * (r(1-A) + A R^2/r)), i.e. c + (p-c) * ((1-A) + A R^2/r^2) */
    const sc=100/N, M=N*N, QX=new Float32Array(M), QY=new Float32Array(M), K2=new Float32Array(M);
    for(let y=0,i=0;y<N;y++){ const dy=(y+.5)*sc-VY; for(let xx=0;xx<N;xx++,i++){ const dx=(xx+.5)*sc-VX, r2=dx*dx+dy*dy; QX[i]=dx/sc; QY[i]=dy/sc; K2[i]=r2<1e-8?0:R2/r2; } }
    const cx0=VX/sc-.5, cy0=VY/sc-.5, LV=[S];
    for(let l=1;l<=L;l++){ const A=AMAX*l/L, [C,x]=sheet(N), im=x.createImageData(N,N), o=im.data;
      for(let i=0,j=0;i<M;i++,j+=4){ const f=K2[i]?(1-A)+A*K2[i]:1; sampleInto(o,j,src,N,N,cx0+QX[i]*f,cy0+QY[i]*f); }
      x.putImageData(im,0,0); LV.push(C); }
    return (c,t)=>{
      const u=mod(t,P);
      const A=u<.5?0:u<3.3?.5*settle(seg(u,.5,1.5)):u<4.0?.5*(1-E.inOut(seg(u,3.3,4.0))):0;
      const lv=clamp(A/AMAX,0,1)*L, i0=Math.floor(lv), i1=Math.min(L,i0+1), q=lv-i0;
      raw(c); c.imageSmoothingEnabled=true; c.imageSmoothingQuality='low';
      c.drawImage(LV[i0],0,0,px,px);
      if(q>.02){ c.globalAlpha=q; c.drawImage(LV[i1],0,0,px,px); c.globalAlpha=1; }
    };
  } },

/* TURBULENT DISPLACE. Contact sheet: one frame on the strip, silver and grain, of a fountain floor with a Greek-key border. WARP_FX.turbulentdisplace's
   own field (td_noise twice, the boil at .6 x Boil speed, Flow read at x - flow*t; checked point for point against FM._warpFx) at
   Amount 32, Detail 120, Boil speed 2, Flow X 70 px/s. At Detail 60 the same Amount crumples fine lines into noise;
   120 is what reads as water. Amount is keyed up from 0 and back, so the loop joins where nothing moves. 12 fps. */
{ id:'turbulentdisplace', name:'Turbulent Displace', section:'Warping', isNew:true, still:2.0,
  line:'The picture wobbles and churns as if seen through moving water, and the pattern keeps boiling.',
  make(px){
    const P=4.6, FT=12, FH=76, NW=Math.min(200,Math.round(px*.5)), NH=Math.round(NW*FH/100), SCL=1080/NW;
    const AMT=32, SC=120, BOIL=2, FLOWX=70;
    const [F,f]=sheet(NW,NH); f.setTransform(NW/100,0,0,NW/100,0,0);
    /* a fountain floor under water: stone slabs, and a Greek-key border laid in black tesserae */
    f.fillStyle='#c6c4be'; f.fillRect(0,0,100,FH);
    f.strokeStyle='#9a9892'; f.lineWidth=.6; f.beginPath();
    for(let x=-3.5;x<100;x+=12.6){ f.moveTo(x,0); f.lineTo(x,FH); } for(let y=5.2;y<FH;y+=12.6){ f.moveTo(0,y); f.lineTo(100,y); } f.stroke();
    const G=3.3, BY=33.5, KEY=['XXXXX.','X...X.','X.X.X.','X.XXX.','X.....','XXXXXX'];
    f.fillStyle='#c6c4be'; f.fillRect(0,BY-2.6*G,100,10.4*G);
    f.fillStyle='#151413'; f.fillRect(0,BY-2*G,100,G*.7); f.fillRect(0,BY+7.3*G,100,G*.7);
    for(let x0=-2.2*G;x0<100;x0+=6*G) KEY.forEach((row,r)=>{ for(let q=0;q<6;q++) if(row[q]==='X') f.fillRect(x0+q*G-.04,BY+r*G-.04,G+.08,G+.08); });
    f.setTransform(1,0,0,1,0,0);
    const im0=f.getImageData(0,0,NW,NH), src=im0.data;
    /* silver grain, once */
    const r=rng(4417); for(let i=0;i<src.length;i+=4){ const g=(r()+r()+r()-1.5)*17; src[i]+=g; src[i+1]+=g; src[i+2]+=g; }
    const [CL]=sheet(NW,NH); CL.getContext('2d').putImageData(im0,0,0);
    const n=(u,v)=>Math.sin(u)*Math.cos(v*1.3)+Math.sin(u*2.1+v)*.5+Math.cos(u*.5-v*1.7)*.35;
    /* the field on a 3 px lattice (about 15 plate px; at Detail 120 that is within a pixel of the kernel), read bilinearly */
    const ST=3, GW=Math.ceil(NW/ST)+2, GH=Math.ceil(NH/ST)+2, GX=new Float32Array(GW*GH), GY=new Float32Array(GW*GH);
    const IX=new Int32Array(NW), FX=new Float32Array(NW); for(let x=0;x<NW;x++){ IX[x]=(x/ST)|0; FX[x]=x/ST-IX[x]; }
    const [OC,oc]=sheet(NW,NH), out=oc.createImageData(NW,NH), o=out.data, CACHE=new Map();
    const build=(A,tb)=>{
      const ph=.6*BOIL*tb, ox=FLOWX*tb, a=A/SCL;
      for(let gy=0;gy<GH;gy++) for(let gx=0;gx<GW;gx++){ const u=(gx*ST*SCL-ox)/SC, v=gy*ST*SCL/SC;
        const wx=n(u+ph,v), wy=n(u,v-ph*.8), i=gy*GW+gx; GX[i]=n(u+wx+5.2,v+wy)*a; GY[i]=n(u-wy,v+wx+1.7)*a; }
      for(let y=0,j=0;y<NH;y++){ const iy=(y/ST)|0, fy=y/ST-iy, gy1=1-fy, row=iy*GW;
        for(let x=0;x<NW;x++,j+=4){ const fx=FX[x], gx1=1-fx, i=row+IX[x];
          const dx=(GX[i]*gx1+GX[i+1]*fx)*gy1+(GX[i+GW]*gx1+GX[i+GW+1]*fx)*fy;
          const dy=(GY[i]*gx1+GY[i+1]*fx)*gy1+(GY[i+GW]*gx1+GY[i+GW+1]*fx)*fy;
          let sx=(x+dx+.5)|0, sy=(y+dy+.5)|0; if(sx<0) sx=0; else if(sx>NW-1) sx=NW-1; if(sy<0) sy=0; else if(sy>NH-1) sy=NH-1;
          const q=(sy*NW+sx)*4; o[j]=src[q]; o[j+1]=src[q+1]; o[j+2]=src[q+2]; o[j+3]=255; } }
      const [C,cx]=sheet(NW,NH); cx.putImageData(out,0,0); return C;
    };
    const holes=[]; for(let i=0;i<13;i++) holes.push(1.6+i*7.9);
    return (c,t)=>{
      const fr=Math.floor(mod(t,P)*FT), u=fr/FT;
      const A=AMT*(u<.5?0:u<1.1?E.inOut(seg(u,.5,1.1)):u<3.5?1:u<4.1?1-E.inOut(seg(u,3.5,4.1)):0);
      reset(c,px); c.fillStyle=COAL; c.fillRect(0,0,100,100);
      c.fillStyle=PAPER; for(const x of holes){ c.fillRect(x,2.6,4.1,5.4); c.fillRect(x,92,4.1,5.4); }
      c.font=MONO(3.4); c.textAlign='left'; c.textBaseline='alphabetic'; c.fillStyle=PAPER; c.fillText('14A',3,11.2); c.fillText('14',90,11.2);
      raw(c); c.imageSmoothingEnabled=true; c.imageSmoothingQuality='low';
      const k=px/100, top=Math.round(12*k), hh=Math.round(FH*k);
      if(A<.05){ c.drawImage(CL,0,top,px,hh); return; }
      let F12=CACHE.get(fr); if(!F12){ F12=build(A,u); CACHE.set(fr,F12); }   /* each 12 fps frame is worked once, then kept */
      c.drawImage(F12,0,top,px,hh);
    };
  } },

/* WAVE. Comp sheet: a signal flag, bone and vermilion split corner to corner, the one layer, waving on a coal comp. WARP_FX.wave: Amplitude 60, Wavelength 60, Cross wave
   40 (the second wavelength 60 x 46/38), Wave speed 180 deg/s, Amplitude keyed up from 0 and back. The map is inverted point by point
   (x = X - SX(y), y = Y - SY(x), iterated) so the card is drawn as exact vector shapes; two full cycles a loop, so it joins. */
{ id:'wave', name:'Wave', section:'Warping', isNew:true, still:2.0,
  line:'The whole layer ripples: sideways along its height and, more gently, up and down along its width.',
  make(px){
    const P=4, U=100/1080, WL=60*U, WL2=60*46/38*U, CROSS=.4, AMP=60*U, SPD=Math.PI;
    const CX0=14, CX1=86, CY0=30, CY1=78;
    const edge=(ax,ay,bx,by,n)=>{ const p=[]; for(let i=0;i<n;i++){ const q=i/n; p.push([ax+(bx-ax)*q,ay+(by-ay)*q]); } return p; };
    /* a signal flag: bone and vermilion, split corner to corner */
    const UP=[...edge(CX0,CY0,CX1,CY0,40),...edge(CX1,CY0,CX1,CY1,28),...edge(CX1,CY1,CX0,CY1,40),...edge(CX0,CY1,CX0,CY0,28)];   /* the whole card; the vermilion half goes over it */
    const LOW=[...edge(CX0,CY0,CX1,CY1,50),...edge(CX1,CY1,CX0,CY1,40),...edge(CX0,CY1,CX0,CY0,28)];
    const fwd=(X,Y,amp,ph)=>{ let x=X, y=Y; for(let it=0;it<14;it++){ x=X-amp*Math.sin(y/WL+ph); y=Y-amp*CROSS*Math.sin(x/WL2+ph); } return [x,y]; };
    const shape=(c,pts,amp,ph)=>{ c.beginPath(); pts.forEach((p,i)=>{ const q=amp>0?fwd(p[0],p[1],amp,ph):p; if(i) c.lineTo(q[0],q[1]); else c.moveTo(q[0],q[1]); }); c.closePath(); c.fill(); };
    return (c,t)=>{
      const u=mod(t,P), ph=SPD*u;
      const amp=AMP*(u<.4?0:u<1?E.inOut(seg(u,.4,1)):u<3.2?1:u<3.7?1-E.inOut(seg(u,3.2,3.7)):0);
      reset(c,px); c.fillStyle=COAL; c.fillRect(0,0,100,100);
      c.fillStyle=BONE; shape(c,UP,amp,ph);
      c.fillStyle=VERM; shape(c,LOW,amp,ph);
      tab(c,CX0,CY0-11,'CLIP 01',4.6,BONE,INK);
    };
  } }

);
})();
