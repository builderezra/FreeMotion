/* FreeMotion effect pictures, g1: Shadow Bloom, Checker, Speed Lines, Dots, redrawn after his review of the preview.
   No photographs. Every change is the effect's own maths, read from js/compositor.js; each note names the settings. */
(function(){ 'use strict';
const {TAU,clamp,lerp,seg,E,rng,hash,vnoise,canvasOf,photo,photoCover}=window.FXK;

const INK='#16130f', COAL='#0c0c0d', BONE='#e7e2d5', VERM='#e4471d', KEY='#ffce4a';
const MONO='"Courier Prime","Courier New",Courier,monospace';
const SANS='"Helvetica Neue",Helvetica,Arial,"Segoe UI",system-ui,sans-serif';
const mod=(t,P)=>((t%P)+P)%P;
const begin=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; c.imageSmoothingEnabled=true; c.imageSmoothingQuality='high'; };
function blank(W,H){ const C=document.createElement('canvas'); C.width=W; C.height=H===undefined?W:H; return [C,C.getContext('2d')]; }
function rr(p,x,y,w,h,r){ r=Math.min(r,w/2,h/2); p.moveTo(x+r,y); p.lineTo(x+w-r,y); p.arcTo(x+w,y,x+w,y+r,r); p.lineTo(x+w,y+h-r); p.arcTo(x+w,y+h,x+w-r,y+h,r); p.lineTo(x+r,y+h); p.arcTo(x,y+h,x,y+h-r,r); p.lineTo(x,y+r); p.arcTo(x,y,x+r,y,r); p.closePath(); }
const disc=(p,x,y,r)=>{ p.moveTo(x+r,y); p.arc(x,y,r,0,TAU); };

/* Shadow Bloom's kernel at Smoothness 2-3 (glow6 in js/compositor.js, Dark, Multiply, no knee, inside the layer): every pixel darker
   than the threshold gives 255 - its brightness, that mask is box-blurred PASSES times with the edge pixel repeated (glowBox6), and
   every pixel is multiplied by 1 - mask / 255 x Amount. Built here as that factor at Amount 1, a grey plate laid on with 'multiply' at
   globalAlpha = Amount, which gives exactly pixel x (1 - mask / 255 x Amount). The mask is worked at half size (it is a wide blur, so
   nothing is lost) to keep the build cheap on a phone. */
function glowBox(src,tmp,W,H,R){ const div=2*R+1;
  for(let y=0;y<H;y++){ const row=y*W; let sum=0;
    for(let x=-R;x<=R;x++) sum+=src[row+(x<0?0:(x>=W?W-1:x))];
    for(let x=0;x<W;x++){ tmp[row+x]=sum/div; const ax=x+R+1, sx=x-R; sum+=src[row+(ax>=W?W-1:ax)]-src[row+(sx<0?0:sx)]; } }
  for(let x=0;x<W;x++){ let sum=0;
    for(let y=-R;y<=R;y++) sum+=tmp[(y<0?0:(y>=H?H-1:y))*W+x];
    for(let y=0;y<H;y++){ src[y*W+x]=sum/div; const ay=y+R+1, sy=y-R; sum+=tmp[(ay>=H?H-1:ay)*W+x]-tmp[(sy<0?0:sy)*W+x]; } } }
function shadowBloomFactor(im,N,thrV,R,passes){
  const d=im.data, n=N*N, M=new Float32Array(n), tmp=new Float32Array(n);
  for(let i=0;i<n;i++){ const i4=i*4; if(d[i4+3]===0) continue; const L=.299*d[i4]+.587*d[i4+1]+.114*d[i4+2]; if(L<thrV) M[i]=255-L; }
  for(let k=0;k<passes;k++) glowBox(M,tmp,N,N,R);
  const [C,x]=blank(N), o=x.createImageData(N,N), q=o.data;
  for(let i=0;i<n;i++){ const i4=i*4; let D=M[i]/255; if(D>1) D=1; q[i4]=q[i4+1]=q[i4+2]=255*(1-D); q[i4+3]=255; }
  x.putImageData(o,0,0); return C;
}

window.FX_TILES.push(

/* SHADOW BLOOM. D, two-ink print: an Ink compact cassette with a Bone label, on a keyframe-yellow ground, all one layer. PIXEL_FX
   darkglow: Threshold 40 (the default: 102 levels, so the yellow and the label only receive), Smoothness 3, Amount .85, Radius keyed
   15 -> 30 -> 45 -> 60 px of a 1080 frame (the slider runs 1 to 80). The black spreads a soft shadow out over the yellow, eats in from
   the shell over the label's edges, and greys the small light openings hardest: the two spool hubs and the holes in the head
   window. Amount steps on in three, Radius steps out on fours, Amount steps off. Matched against the real render of this frame
   at 1080 (mean difference under 1 level, the same as the plain frames' resampling). */
{ id:'darkglow', name:'Shadow Bloom', section:'Colouring', isNew:true, still:2.4,
  line:'The dark parts of the picture spread a soft shadow out into the lighter areas round them; Radius sets how far it reaches.',
  make(px){
    const P=4.6, N=Math.min(px,600), AMT=.85, RADII=[15,30,45,60];
    const [S,s]=blank(N); s.setTransform(N/100,0,0,N/100,0,0);
    s.fillStyle=KEY; s.fillRect(0,0,100,100);
    /* the cassette, seen flat, a few degrees off true, its right end at the frame's edge */
    s.save(); s.translate(55,57); s.rotate(-8*Math.PI/180); s.scale(1.22,1.22);
    let p=new Path2D(); rr(p,-37,-24,74,48,2.6); s.fillStyle=INK; s.fill(p);
    p=new Path2D(); rr(p,-33,-21,66,30.5,1.1); s.fillStyle=BONE; s.fill(p);
    /* the label: a ruled line, the side letter, a hand-written title in pen */
    s.fillStyle=INK; s.font='800 7px '+SANS; s.textBaseline='alphabetic'; s.fillText('A',-30.6,-12.4);
    s.fillRect(-24,-13.6,52,.45);
    s.strokeStyle=INK; s.lineWidth=.55; s.lineCap='round'; s.lineJoin='round'; s.beginPath();
    const R0=rng(7); let hx=-22.5; s.moveTo(hx,-16.2);
    while(hx<14){ hx+=1.1+R0()*.9; s.lineTo(hx,-16.2-(R0()*2.6)); hx+=.6+R0()*.6; s.lineTo(hx,-15.4+R0()*.5); }
    s.stroke();
    /* the window, the tape wound on the left spool, and the two hubs with their teeth */
    const WIN=new Path2D(); rr(WIN,-21,-9.5,42,13.5,6.75);
    s.fillStyle=INK; s.fill(WIN);
    s.save(); s.clip(WIN); s.fillStyle='#4b3526'; s.beginPath(); disc(s,-12,-2.75,10.2); disc(s,12,-2.75,6.2); s.fill(); s.restore();
    for(const cx of [-12,12]){ s.fillStyle=BONE; s.beginPath(); disc(s,cx,-2.75,4.4); s.fill();
      s.fillStyle=INK; s.beginPath(); disc(s,cx,-2.75,2.5); s.fill();
      for(let k=0;k<6;k++){ const a=k*TAU/6+.3; s.save(); s.translate(cx+Math.cos(a)*2.5,-2.75+Math.sin(a)*2.5); s.rotate(a); s.fillRect(-.2,-.55,1.05,1.1); s.restore(); } }
    /* the head window at the bottom edge, its tape openings, and five screws */
    p=new Path2D(); p.moveTo(-25,24); p.lineTo(-21,13.6); p.lineTo(21,13.6); p.lineTo(25,24); p.closePath(); s.fillStyle='#2b2620'; s.fill(p);
    s.fillStyle=BONE; s.beginPath(); disc(s,-14,19.2,1.8); disc(s,14,19.2,1.8); s.fill();
    s.fillRect(-6.3,17.6,3.2,3.2); s.fillRect(3.1,17.6,3.2,3.2);
    s.fillStyle='#9a9384'; s.beginPath(); for(const q of [[-34,-21.5],[34,-21.5],[-34,21.5],[34,21.5],[0,21.2]]) disc(s,q[0],q[1],1.05); s.fill();
    s.restore();
    s.setTransform(1,0,0,1,0,0);
    const HM=Math.max(60,Math.round(N/2)), [HS,hs]=blank(HM); hs.imageSmoothingQuality='high'; hs.drawImage(S,0,0,HM,HM);
    const im=hs.getImageData(0,0,HM,HM);
    const FAC=RADII.map(r=>shadowBloomFactor(im,HM,102,Math.max(1,Math.round(r*HM/1080)),3));
    /* Amount on in three steps at Radius 15, Radius out on fours, Amount off in three at 60 */
    const state=u=>{
      if(u<.6||u>=4.0) return [0,0];
      if(u<1.0) return [AMT*Math.min(3,Math.floor((u-.6)/.125)+1)/3,0];
      if(u<1.45) return [AMT,0];
      if(u<3.55) return [AMT,Math.min(3,Math.floor((u-1.45)/.165)+1)];
      return [AMT*Math.max(0,2-Math.floor((u-3.55)/.15))/3,3];
    };
    const draw=(c,t)=>{ const [a,k]=state(mod(t,P));
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; c.imageSmoothingEnabled=true; c.imageSmoothingQuality='high';
      c.drawImage(S,0,0,px,px);
      if(a>0){ c.globalCompositeOperation='multiply'; c.globalAlpha=a; c.drawImage(FAC[k],0,0,px,px); c.globalAlpha=1; c.globalCompositeOperation='source-over'; }
    };
    draw.truth={type:'darkglow',params:{amount:AMT,radius:RADII[3],passes:3},src:S};   /* for checking beside the real renderer */
    return draw;
  } },

/* CHECKER. A draughts game seen from above, and the board is the effect. PIXEL_FX.checker on a plain Coal layer of an
   800 px frame: Cell size 120 (15 units; the kernel starts the board at the layer's top-left, so the frame ends two-thirds of a square
   in), Colour vermilion, Strength .7, so every other square is pulled 70 % of the way to vermilion and the top-left one is left
   alone. The pieces are their own layer above: they sit on the squares the kernel leaves black, as draughts are played. Strength
   steps on in three, Scroll across (keyframed, so it is integrated) slides the board exactly two squares, which is the same board,
   and Strength steps off. The held frame matches the real render of this comp (pieces over a Coal layer with this Checker). */
{ id:'checker', name:'Checker', section:'Generative', isNew:true, still:1.3,
  line:'Every other square is mixed toward your colour across the whole layer; here it turns a plain black layer into the board under the pieces.',
  make(px){
    const P=4.6, CELL=15, MIX=.7;
    const strength=m=>{ if(m<.55||m>=4.2) return 0; if(m<.925) return MIX*Math.min(3,Math.floor((m-.55)/.125)+1)/3; if(m<3.825) return MIX; return MIX*Math.max(0,2-Math.floor((m-3.825)/.125))/3; };
    const scroll=m=>2*CELL*E.inOut(seg(m,1.9,2.5));
    /* the position: vermilion men at the top, bone men below, one bone king that has crossed the board */
    const MEN=[[2,0,'v'],[4,0,'v'],[5,1,'v'],[2,2,'v'],[4,2,'v'],[3,3,'b'],[0,4,'b'],[4,4,'b'],[1,5,'b'],[5,5,'b'],[1,1,'k'],[6,6,'b']];
    const [PC,pc]=blank(px); pc.setTransform(px/100,0,0,px/100,0,0);
    const man=(x,y,col,rim,groove)=>{ pc.fillStyle=col; pc.beginPath(); disc(pc,x,y,6.2); pc.fill();
      pc.strokeStyle=rim; pc.lineWidth=.5; pc.beginPath(); disc(pc,x,y,5.95); pc.stroke();
      pc.strokeStyle=groove; pc.lineWidth=.42; pc.beginPath(); disc(pc,x,y,4.5); pc.stroke(); pc.beginPath(); disc(pc,x,y,2.7); pc.stroke(); };
    for(const q of MEN){ const x=q[0]*CELL+CELL/2, y=q[1]*CELL+CELL/2;
      if(q[2]==='v') man(x,y,VERM,'#a8300f','#b23410');
      else if(q[2]==='b') man(x,y,BONE,'#a39c8d','#b2ab9c');
      else { man(x+.8,y+1.1,'#b9b2a3','#8c8577','#9a9384'); man(x-.5,y-.7,BONE,'#a39c8d','#b2ab9c'); } }
    const draw=(c,t)=>{ begin(c,px); const m=mod(t,P), k=strength(m);
      c.fillStyle=COAL; c.fillRect(0,0,100,100);
      if(k>0){ const ox=scroll(m); c.globalAlpha=k; c.fillStyle=VERM; c.beginPath();
        for(let j=0;j*CELL<100;j++) for(let i=-3;i*CELL+ox<100;i++){ if(((i+j)&1)===0) continue; const x=ox+i*CELL; if(x+CELL<=0) continue; c.rect(x,j*CELL,CELL,CELL); }
        c.fill(); c.globalAlpha=1; }
      c.setTransform(1,0,0,1,0,0); c.drawImage(PC,0,0); begin(c,px);
    };
    draw.truth={type:'checker',project:800,params:{size:120,mix:MIX,color:VERM},base:COAL,top:PC};
    return draw;
  } },

/* SPEED LINES. G, cut paper: a boxing glove thrown at the frame. The lines are the kernel's Radial style exactly, on the Bone backdrop
   layer of a 1080 frame: its hash, Lines 64, Clear zone 30 % stretched to 140 % (wider than tall, round the glove), Length 55,
   Weight 22 px, Scatter .5, Focus X 60 Y 52 on the fist, Ink #0d0d12; Boil 12 Hz redraws them, salted per redraw as the kernel
   salts them. The glove is its own layer above, keyframed: it is drawn back, thrown with an overshoot, and the lines cut on with it.
   Frame for frame the same lines as the real render (checked at t 1.6: Boil redraw 19). */
{ id:'speedlines', name:'Speed Lines', section:'Generative', isNew:true, still:1.6,
  line:'Tapered ink lines drive in from the frame edge toward a point you place, leaving a clear space round your subject; Boil redraws them.',
  make(px){
    const P=4, BOIL=12, COUNT=64, FX=60, FY=52, F=100/1080, maxR=Math.hypot(100,100)/2, innerR=.30*maxR, lenR=.55*maxR, wid=22*F, jit=.5;
    const zk=1.4, zsx=Math.sqrt(zk), zsy=1/zsx, outR=maxR*1.12, step=TAU/COUNT;
    const hash0=n=>{ n=(n^61)^(n>>>16); n=n+(n<<3); n=n^(n>>>4); n=Math.imul(n,0x27d4eb2d); n=n^(n>>>15); return (n>>>0)/4294967296; };
    const [IK,ik]=blank(px); let last=-1;
    const ink=fr=>{ if(fr===last) return; last=fr; const salt=fr>0?Math.imul(fr,0x9E3779B1):0, hs=salt?n=>hash0((n+salt)|0):hash0;
      ik.setTransform(1,0,0,1,0,0); ik.globalCompositeOperation='source-over'; ik.clearRect(0,0,px,px); ik.setTransform(px/100,0,0,px/100,0,0);
      ik.fillStyle='#0d0d12';
      for(let i=0;i<COUNT;i++){ const h1=hs(i*3+1), h2=hs(i*3+2), h3=hs(i*3+3);
        const a=i*step+(h1-.5)*step*2*jit, ca=Math.cos(a), sa=Math.sin(a);
        const zr=innerR/Math.hypot(ca/zsx,sa/zsy), tip=Math.min(outR-2*F,zr*(.92+.5*h2*jit)), base=Math.min(outR,tip+lenR*(.55+.9*h3));
        if(base-tip<F) continue;
        const hw=wid*(.35+.85*h2)*.5, nx=-sa*hw, ny=ca*hw;
        ik.beginPath(); ik.moveTo(FX+ca*base+nx,FY+sa*base+ny); ik.lineTo(FX+ca*base-nx,FY+sa*base-ny); ik.lineTo(FX+ca*tip,FY+sa*tip); ik.closePath(); ik.fill(); }
      ik.save(); ik.translate(FX,FY); ik.scale(zsx,zsy);
      const g=ik.createRadialGradient(0,0,innerR*.35,0,0,innerR*1.25); g.addColorStop(0,'rgba(0,0,0,1)'); g.addColorStop(1,'rgba(0,0,0,0)');
      ik.globalCompositeOperation='destination-out'; ik.fillStyle=g; ik.beginPath(); ik.arc(0,0,innerR*1.25,0,TAU); ik.fill(); ik.restore();
      ik.globalCompositeOperation='source-over'; };
    /* the glove, side on, punching right: cuff running off the left edge, the fist, the thumb laid along its underside */
    const CUFF=new Path2D(); CUFF.moveTo(-30,39.5); CUFF.lineTo(37,37.2); CUFF.lineTo(37,65.6); CUFF.lineTo(-30,63.5); CUFF.closePath();
    const FIST=new Path2D(); FIST.moveTo(35,38.6);
    FIST.bezierCurveTo(41,30.5,54,27.2,66,28.6); FIST.bezierCurveTo(79,30,87.5,38,87.5,50.5);
    FIST.bezierCurveTo(87.5,63,80.5,71.2,67.5,72.2); FIST.bezierCurveTo(57,73,47,70.6,39.5,66.4); FIST.lineTo(35,65); FIST.closePath();
    /* the thumb is a lobe stitched along the fist's underside: only its top seam and its tip show as a line */
    const THUMB=new Path2D(); THUMB.moveTo(38.6,62.2); THUMB.bezierCurveTo(46,56.4,60,54.2,72.5,57.4);
    THUMB.bezierCurveTo(79.4,59.2,81.4,64.6,77.8,68.4);
    const PANEL=new Path2D(); PANEL.moveTo(69.5,31.4); PANEL.bezierCurveTo(78.5,35,82.6,42.6,82.4,51);
    const glove=(c,dx)=>{ c.save(); c.translate(dx,0);
      c.fillStyle=VERM; c.fill(CUFF); c.fill(FIST);
      c.fillStyle=BONE; c.beginPath(); c.moveTo(18,38.2); c.lineTo(25,37.9); c.lineTo(25,64.6); c.lineTo(18,64.3); c.closePath(); c.fill();
      c.strokeStyle=INK; c.lineWidth=.75; c.lineJoin='round'; c.lineCap='round';
      c.beginPath(); c.moveTo(36.6,37.6); c.lineTo(36.2,65.4); c.stroke();
      c.stroke(THUMB); c.stroke(PANEL);
      c.strokeStyle=BONE; c.lineWidth=1.3; c.beginPath(); c.moveTo(45,34.6); c.quadraticCurveTo(54,30.4,64.5,30.9); c.stroke();
      c.restore(); };
    const BACK=-17, settle=q=>q<=0?0:q>=1?1:1-Math.pow(2,-9*q)*Math.cos(q*10.5);
    const pos=u=>u<.5?BACK:u<1.3?BACK*(1-settle(seg(u,.5,1.3))):u<3.05?0:u<3.75?BACK*E.inOut(seg(u,3.05,3.75)):BACK;
    const draw=(c,t)=>{ const u=mod(t,P); begin(c,px);
      c.fillStyle=BONE; c.fillRect(0,0,100,100);
      if(u>=.6&&u<3.0){ ink(Math.floor(u*BOIL)); c.setTransform(1,0,0,1,0,0); c.drawImage(IK,0,0); begin(c,px); }
      glove(c,pos(u));
    };
    draw.truth={type:'speedlines',project:1080,params:{count:COUNT,inner:30,aspect:140,length:55,width:22,jitter:.5,boil:BOIL,x:FX,y:FY},base:BONE,glove:c=>glove(c,0)};
    return draw;
  } },

/* DOTS. D, two-ink print: a fifties dress on a hanger, cut out as its own layer (Ink), on a vermilion ground. PIXEL_FX.dots on the
   dress layer only, a 720 frame: Colour Bone, Strength .85, Spacing 72 px (ten across), hard edges. Dot size is keyed .06 up to .32
   (the default) on twos, Layout cuts from Grid to Staggered (every other row half a dot along: the kernel's dots966), then the dots
   shrink away. Every dot is the same size whatever is under it, which is what separates this from Halftone, and the grid is the
   frame's, not the fabric's: a dot on the edge is cut by it. The hanger is another layer. */
{ id:'dots', name:'Dots', section:'Generative', isNew:true, still:3.0,
  line:'Rows of same-size dots in one colour are painted wherever the layer is, here only on the dress; Staggered slides every other row half a dot.',
  make(px){
    const P=4.6, S=10, A=.85;
    const D=new Path2D();
    D.moveTo(38.5,13.4); D.quadraticCurveTo(45,20.5,51.5,13.4);                     /* the neckline */
    D.lineTo(58.6,14.6); D.quadraticCurveTo(63.4,17.4,65,23.2); D.lineTo(59.4,25.4);  /* right shoulder and cap sleeve */
    D.quadraticCurveTo(57.4,33,55.8,41.2);                                           /* bodice into the waist */
    D.bezierCurveTo(66,55,78,78,88.5,103);                                           /* the skirt, full, off the hem */
    D.lineTo(1.5,103);
    D.bezierCurveTo(12,78,24,55,34.2,41.2);
    D.quadraticCurveTo(32.6,33,30.6,25.4); D.lineTo(25,23.2); D.quadraticCurveTo(26.6,17.4,31.4,14.6); D.closePath();
    /* it hangs a few degrees askew from the hook, so the frame's dot grid runs across it at an angle */
    const PVX=45, PVY=6.4, ROT=-3.2*Math.PI/180;
    const tilt=(c,k)=>{ c.setTransform(k,0,0,k,0,0); c.translate(PVX,PVY); c.rotate(ROT); c.translate(-PVX,-PVY); };
    const [DL,dl]=blank(px); tilt(dl,px/100);
    dl.fillStyle=INK; dl.fill(D);
    /* the waist seam and two pressed pleats, a lighter ink in the layer itself */
    dl.save(); dl.clip(D); dl.strokeStyle='#3a332b'; dl.lineWidth=.6; dl.lineCap='round';
    dl.beginPath(); dl.moveTo(33,41.6); dl.quadraticCurveTo(45,43.6,57,41.6);
    dl.moveTo(40,44); dl.quadraticCurveTo(34,70,27,103); dl.moveTo(50,44); dl.quadraticCurveTo(56,70,63,103); dl.stroke(); dl.restore();
    const size=m=>{ if(m<.5||m>=4.2) return 0; if(m<1.0) return .06+.26*Math.min(5,Math.floor((m-.5)/(1/12)))/5; if(m<3.7) return .32; return .32-.26*Math.min(5,Math.floor((m-3.7)/(1/12))+1)/5; };
    const draw=(c,t)=>{ begin(c,px); const m=mod(t,P), r=size(m)*S, stag=m>=2.2;
      c.fillStyle=VERM; c.fillRect(0,0,100,100);
      /* the hanger: hook from the rail, a wooden bar */
      c.strokeStyle=INK; c.lineWidth=1.1; c.lineCap='round'; c.lineJoin='round';
      c.beginPath(); c.moveTo(42.6,-1); c.lineTo(42.6,3.4); c.quadraticCurveTo(42.6,6.4,45,6.4); c.quadraticCurveTo(47.4,6.4,47.4,4.2); c.stroke();
      c.save(); tilt(c,px/100); c.lineWidth=1.6; c.beginPath(); c.moveTo(45,6.6); c.lineTo(45,8.4); c.moveTo(24,15.6); c.quadraticCurveTo(45,6.2,66,15.6); c.stroke(); c.restore();
      c.setTransform(1,0,0,1,0,0); c.drawImage(DL,0,0); begin(c,px);
      /* the dots: the frame's grid, clipped to the dress layer's shape */
      if(r>0){ c.save(); tilt(c,px/100); c.clip(D); begin(c,px); c.globalAlpha=A; c.fillStyle=BONE; c.beginPath();
        for(let j=0;j*S<100;j++){ const xo=stag&&(j&1)?0:S/2, cy=j*S+S/2; for(let i=-1;i*S<101;i++) disc(c,i*S+xo,cy,r); }
        c.fill(); c.restore(); c.globalAlpha=1; }
    };
    draw.truth={type:'dots',project:720,params:{size:72,radius:.32,opacity:A,color:BONE,stagger:1},layer:DL};
    return draw;
  } }

);
})();
