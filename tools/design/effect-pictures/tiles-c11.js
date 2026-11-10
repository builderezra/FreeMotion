/* FreeMotion effect pictures, artist 11 (c11): seven Stylize tiles. No photographs: every subject is drawn here, and each
   effect runs on it with its own maths from js/compositor.js (named in each tile's note). */
(function(){ 'use strict';
const {TAU,clamp,lerp,seg,E,rng,hash,vnoise,canvasOf,photo,photoCover}=window.FXK;

const BONE='#e7e2d5', PAPER='#d9d4c6', INK='#16130f', COAL='#0c0c0d', DIM='#8b96a8', VERM='#e4471d', RTEAL='#1f7f70', RYEL='#f6c544';
const MONO=s=>'bold '+s+'px "Courier Prime","Courier New",monospace';
const SANS=s=>'800 '+s+'px "Helvetica Neue",Helvetica,Arial,"Segoe UI",system-ui,sans-serif';
const mod=(t,P)=>((t%P)+P)%P;
const reset=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; };
const canvasN=(w,h)=>{ const C=document.createElement('canvas'); C.width=w; C.height=(h===undefined?w:h); return [C,C.getContext('2d')]; };
/* damped settle, for a value keyframed with an overshoot ease */
const settle=p=>p<=0?0:p>=1?1:1-Math.pow(2,-8.5*p)*Math.cos(p*9.5);
const tab=(c,x,y,txt,s,bg,fg)=>{ c.font=MONO(s); const w=c.measureText(txt).width; c.fillStyle=bg; c.fillRect(x,y,w+s*.9,s*1.5); c.fillStyle=fg; c.textBaseline='middle'; c.textAlign='left'; c.fillText(txt,x+s*.45,y+s*.8); };
const poly=(c,p)=>{ c.beginPath(); for(let i=0;i<p.length;i+=2){ if(i) c.lineTo(p[i],p[i+1]); else c.moveTo(p[i],p[i+1]); } c.closePath(); };
/* one separable box pass, edge-clamped, exactly as PIXEL_FX.dropshadow runs it (running sums along rows, then columns) */
function boxPass(src,W,H,R){
  const win=2*R+1, tmp=new Float32Array(W*H), out=new Float32Array(W*H);
  for(let y=0;y<H;y++){ const row=y*W; let acc=0; for(let k=-R;k<=R;k++) acc+=src[row+Math.min(W-1,Math.max(0,k))];
    for(let x=0;x<W;x++){ tmp[row+x]=acc/win; acc+=src[row+Math.min(W-1,x+R+1)]-src[row+Math.max(0,x-R)]; } }
  for(let x=0;x<W;x++){ let acc=0; for(let k=-R;k<=R;k++) acc+=tmp[Math.min(H-1,Math.max(0,k))*W+x];
    for(let y=0;y<H;y++){ out[y*W+x]=acc/win; acc+=tmp[Math.min(H-1,y+R+1)*W+x]-tmp[Math.max(0,y-R)*W+x]; } }
  return out;
}
/* Film Damage's own integer hash (fdMix / fdHash): every mark is a function of (film frame, Pattern, index) */
const fdMix=h=>{ h=Math.imul(h^(h>>>16),0x85ebca6b); h=Math.imul(h^(h>>>13),0xc2b2ae35); return h^(h>>>16); };
const fdHash=(a,b,c)=>(fdMix(fdMix(fdMix((a|0)^0x2545f491)+(b|0))+(c|0))>>>0)/4294967296;
/* Glitter's lattice hash (e1Hash) */
const e1=k=>{ k=Math.imul(k^(k>>>16),0x85ebca6b); k=Math.imul(k^(k>>>13),0xc2b2ae35); return ((k^(k>>>16))>>>0)/4294967296; };

/* a mid-century house in greys, drawn in 0..100 units with room round the edge for the gate weave */
function paintHouse(x){
  x.fillStyle='#c9c6bc'; x.fillRect(-12,-12,124,80);
  x.fillStyle='#7d7a72'; x.fillRect(-12,66,124,48);
  x.fillStyle='#a6a39a'; x.fillRect(-12,66,124,2.4);
  /* the pool */
  x.fillStyle='#dcdcd5'; x.fillRect(28,73.5,66,8.5); x.fillStyle='#4f4f4a'; x.fillRect(28,73.5,66,1.1);
  x.fillStyle='#b8b9b2'; x.fillRect(34,77,40,.7);
  /* glass wall: panes catch the sky unevenly, steel mullions between */
  const PW=52/6; for(let i=0;i<6;i++){ x.fillStyle=(i%2)?'#4d504f':'#383a39'; x.fillRect(34+i*PW,40,PW,26); }
  x.fillStyle='#5f6261'; x.fillRect(34+PW*2,40,PW,9);
  x.fillStyle='#151514'; for(let i=0;i<=6;i++) x.fillRect(34+i*PW-.35,40,.7,26);
  /* the solid white block, and its shaded return */
  x.fillStyle='#e6e3da'; x.fillRect(86,37,26,29); x.fillStyle='#9c998f'; x.fillRect(86,37,.7,29);
  /* the roof slab: a lit fascia over a dark soffit, cantilevered past the glass onto one steel column */
  x.fillStyle='#ebe8df'; x.fillRect(20,33,92,4); x.fillStyle='#252420'; x.fillRect(20,37,92,3);
  x.fillStyle='#151514'; x.fillRect(24,40,.9,26);
  /* a palm, off to the left */
  x.strokeStyle='#262522'; x.lineCap='round'; x.lineWidth=1.1;
  x.beginPath(); x.moveTo(12.5,66.5); x.bezierCurveTo(14,46,8,30,9.6,15.5); x.stroke();
  x.lineWidth=.7; const FR=[[-1.5,20,2,13],[1,10.5,4,9],[8.5,6,9,8],[17.5,9.5,14,8.5],[21,17.5,17,12],[15.5,23,13,17],[3,23.5,5,17]];
  for(const f of FR){ x.beginPath(); x.moveTo(9.6,15.5); x.quadraticCurveTo(f[2],f[3],f[0],f[1]); x.stroke(); }
}

/* a courier's parcel label, Ink and vermilion on Bone: a vermilion PRIORITY band, the sender and the address in Courier, the sort box
   (white route code reversed out of solid ink) in the middle, on the word's anchor, then the barcode and its digits. Enlarged, the
   sort box fills the letters, so the word comes up in ink with pieces of the giant route code in it. (Checker k2: this replaces a
   pen-plotter contour survey, which put a second set of black contour rings on Bone beside Topo Lines; a street map was tried and
   dropped, because Wormhole is one.) */
const LBL_X=50, LBL_Y=46;
function paintLabel(x){
  x.fillStyle=BONE; x.fillRect(0,0,100,100);
  x.fillStyle=VERM; x.fillRect(0,0,100,13.5);
  x.font=SANS(7.4); x.textAlign='left'; x.textBaseline='middle'; x.fillStyle=BONE; x.fillText('PRIORITY',5,7.2);
  x.font=MONO(3.4); x.textAlign='right'; x.fillText('1 / 1',95,7.4);
  x.textAlign='left'; x.fillStyle=INK; x.font=MONO(2.7);
  [['FROM  CUTTING ROOM 3',18.6],['TO    E. HALL, 14 MURRAY ST',23.4],['      PERTH WA 6000',28.2]].forEach(([s,y])=>x.fillText(s,5,y));
  x.fillRect(5,32.4,90,.6);
  /* the sort bar: solid ink, the route code reversed out of its left end */
  x.font=SANS(5.2); x.textAlign='left'; x.fillText('W6 03',5,38.6); x.font=MONO(2.6); x.textAlign='right'; x.fillText('ZONE 2  VAN 11',95,38.6);
  x.fillRect(5,42,90,8.4); x.fillStyle=BONE; x.font=MONO(3.2); x.textAlign='left'; x.fillText('SORT',7,46.4); x.textAlign='right'; x.fillText('DAY 4',93,46.4);
  x.fillStyle=INK; x.fillRect(5,58.6,90,.6);
  /* the bars: a quiet zone, then bars and spaces of 1 to 4 modules, Code 128 style, from a fixed seed */
  const R=rng(128), MOD=.42, Y0=62, Y1=79.4; let X=8.4, bar=true;
  x.fillRect(X,Y0,MOD*2,Y1-Y0+2); X+=MOD*3; x.fillRect(X,Y0,MOD,Y1-Y0+2); X+=MOD*2;
  while(X<89.6){ const w=(1+Math.floor(R()*R()*4.2))*MOD; if(bar) x.fillRect(X,Y0,w,Y1-Y0); X+=w; bar=!bar; }
  x.fillRect(90.2,Y0,MOD*2,Y1-Y0+2); x.fillRect(91.5,Y0,MOD,Y1-Y0+2);
  x.font=MONO(3); x.textAlign='center'; x.fillText('0 4 2 6 1 8 5 5 3 0 9 7',50,84.2);
  x.textAlign='left'; x.font=MONO(2.7); x.fillText('WT 2.4 KG',5,92.4);
}

window.FX_TILES.push(

/* DROP SHADOW. Cut paper. PIXEL_FX.dropshadow on a cut-out pair of scissors: its alpha shifted by Distance at Angle, one box pass
   of Softness, black at Opacity 82, behind the layer, so the finger holes cast their own shadow. Distance 0 to 54 px and Softness
   2 to 14 px are keyed together (a lift, with an overshoot ease), then Angle goes 135 to 45 degrees on twos. A 1080 comp. */
{ id:'dropshadow', name:'Drop Shadow', section:'Stylize', isNew:true, still:2.0,
  line:'A soft dark copy of the layer’s outline falls behind it, holes and all, pushed out by the distance and angle you set.',
  make(px){
    const P=4.6, N=Math.min(px,420), k=N/100;
    /* the scissors, drawn once in 0..100 units: two blades and two finger loops, a rivet at the pivot */
    const scissors=(x,col,rivet)=>{ const PX=55, PY=45, deg=TAU/360;
      x.fillStyle=col;
      for(const [a,len,loop] of [[-31*deg,43,25],[-67*deg,41,23]]){
        const dx=Math.cos(a), dy=Math.sin(a), nx=-dy, ny=dx;
        poly(x,[PX+nx*3.9,PY+ny*3.9, PX+dx*len*.55+nx*2.9,PY+dy*len*.55+ny*2.9, PX+dx*len+nx*.5,PY+dy*len+ny*.5, PX+dx*len-nx*.4,PY+dy*len-ny*.4, PX-nx*3.6,PY-ny*3.6]); x.fill();
        const LX=PX-dx*loop, LY=PY-dy*loop;
        poly(x,[PX+nx*3.2,PY+ny*3.2, LX+nx*2.6+dx*5,LY+ny*2.6+dy*5, LX-nx*2.6+dx*5,LY-ny*2.6+dy*5, PX-nx*3.2,PY-ny*3.2]); x.fill();
        x.beginPath(); x.ellipse(LX,LY,10.2,7.6,a,0,TAU); x.fill();
        x.save(); x.globalCompositeOperation='destination-out'; x.beginPath(); x.ellipse(LX-dx*.6,LY-dy*.6,6.6,4.2,a,0,TAU); x.fill(); x.restore();
      }
      if(rivet){ x.fillStyle=rivet; x.beginPath(); x.arc(PX,PY,1.5,0,TAU); x.fill(); } };
    const [OBJ,ob]=canvasN(px); ob.setTransform(px/100,0,0,px/100,0,0); scissors(ob,VERM,BONE);
    const [M,mx]=canvasN(N); mx.setTransform(k,0,0,k,0,0); scissors(mx,'#fff',null);
    const md=mx.getImageData(0,0,N,N).data, A=new Float32Array(N*N); for(let i=0;i<N*N;i++) A[i]=md[i*4+3];
    const SOFT=[2,5,8,11,14], OP=.82;
    const LV=SOFT.map(sp=>{ const R=Math.max(0,Math.round(sp*N/1080)), b=R?boxPass(A,N,N,R):A, [C,x]=canvasN(N), im=x.createImageData(N,N);
      for(let i=0;i<N*N;i++) im.data[i*4+3]=Math.min(255,b[i])*OP; x.putImageData(im,0,0); return C; });
    const [SH,sh]=canvasN(N);
    return (c,t)=>{
      const u=mod(t,P);
      const lift = u<.5?0 : u<3.7? settle(seg(u,.5,1.45)) : 1-E.inOut(seg(u,3.7,4.3));
      const st=Math.floor(u*12)/12;
      const ang = u<2.2?135 : u<4.35? lerp(135,45,E.inOut(seg(st,2.2,2.85))) : 135;
      const dist=54*lift, soft=2+12*clamp(lift);
      reset(c,px); c.fillStyle=PAPER; c.fillRect(0,0,100,100);
      if(dist>.05){
        /* two neighbouring Softness steps mixed with 'lighter', which lerps their alphas exactly */
        const q=(soft-2)/3, i0=Math.min(3,Math.floor(q)), f=q-i0;
        sh.setTransform(1,0,0,1,0,0); sh.globalCompositeOperation='source-over'; sh.globalAlpha=1; sh.clearRect(0,0,N,N);
        sh.globalCompositeOperation='lighter'; sh.globalAlpha=1-f; sh.drawImage(LV[i0],0,0); if(f>0){ sh.globalAlpha=f; sh.drawImage(LV[i0+1],0,0); }
        sh.globalCompositeOperation='source-over'; sh.globalAlpha=1;
        const a=ang*TAU/360, dx=Math.cos(a)*dist/10.8, dy=Math.sin(a)*dist/10.8;
        c.drawImage(SH,dx,dy,100,100);
      }
      c.drawImage(OBJ,0,0,100,100);
      if(dist>.5) tab(c,4,4,Math.round(ang)+'°',4.4,INK,BONE);
    };
  } },

/* FILM DAMAGE. A projected still. PIXEL_FX.filmdamage's own placement, hash for hash: six scratch tracks, dust and hairs per film
   frame, Gate weave, Splice jumps and the lamp's Flicker, at Projector speed 18. Scratches .5, Dust .55, Hairs .5, Flicker .45,
   Weave 3 px, Splice .18, Dirt: Both. Drawn as a 540 px comp (half of a 1080 frame), so the specks and hairs keep a size you can see. */
{ id:'filmdamage', name:'Film Damage', section:'Stylize', isNew:true, still:1.25,
  line:'Scratches, dust and hairs run over the picture while it flickers and weaves in the gate, like a worn projector print.',
  make(px){
    const P=4, FPS=18, U=100/540, W=100, H=100, SCR=.5, DUST=.55, HAIR=.5, FLK=.45, WEAVE=3, SPLICE=.18, seedK=0, MG=8;
    const SWp=Math.round(px*(100+2*MG)/100), [S,sx]=canvasN(SWp); sx.setTransform(px/100,0,0,px/100,MG*px/100,MG*px/100); paintHouse(sx);
    const [F,fx]=canvasN(px), lightOf=h=>h<.5;
    const ink=(light,a)=>{ fx.globalAlpha=Math.min(1,a); fx.fillStyle=fx.strokeStyle=light?'#ffffff':'#000000'; };
    const dot=(cx,cy,r,op,light)=>{ ink(light,op); fx.beginPath(); fx.arc(cx,cy,r+.5*U,0,TAU); fx.fill(); };
    return (c,t)=>{
      const u=mod(t,P), on=u>=.45&&u<3.55;
      reset(c,px);
      if(!on){ c.drawImage(S,-MG,-MG,100+2*MG,100+2*MG); return; }
      const frame=Math.floor(u*FPS+1e-9);
      /* 1. where the frame sits: weave, and now and then a splice jump with the black frame line at the join */
      const wv=WEAVE*U;
      const dx=wv*(.6*Math.sin(TAU*(frame/11+fdHash(7,seedK,1)))+.4*(2*fdHash(frame,seedK+2,0)-1));
      const dy=.45*wv*(.6*Math.sin(TAU*(frame/17+fdHash(7,seedK,2)))+.4*(2*fdHash(frame,seedK+3,0)-1));
      let jump=0; const g=frame*.6180339887498949+.5+seedK*.7548776662466927, spliced=(g-Math.floor(g))<SPLICE*.25;
      if(spliced){ const h=fdHash(frame,seedK+4,0), m=h<.5?h*2:h*2-1; jump=(h<.5?-1:1)*(.08+.27*m)*H; }
      reset(fx,px);
      if(!spliced) fx.drawImage(S,dx-MG,dy-MG,100+2*MG,100+2*MG);
      else { const j=mod(dy+jump,100);
        fx.save(); fx.beginPath(); fx.rect(0,j,100,100-j); fx.clip(); fx.drawImage(S,dx-MG,j-MG,100+2*MG,100+2*MG); fx.restore();
        fx.save(); fx.beginPath(); fx.rect(0,0,100,j); fx.clip(); fx.drawImage(S,dx-MG,j-100-MG,100+2*MG,100+2*MG); fx.restore();
        fx.fillStyle='#000'; fx.fillRect(0,j-2,100,4); }
      /* 2. the dirt on the print */
      fx.lineCap='butt'; fx.lineJoin='round';
      for(let k=0;k<6;k++){
        const L=14+Math.floor(fdHash(k,seedK+30,0)*40), off=Math.floor(fdHash(k,seedK+31,0)*L), ep=Math.floor((frame+off)/L);
        if(fdHash(ep,seedK+32,k)>=SCR) continue;
        const ph=(frame+off-ep*L)/L, x0=fdHash(ep,seedK+33,k), drift=(fdHash(ep,seedK+34,k)-.5)*.04;
        const cx=(x0+drift*ph)*W+(fdHash(frame,seedK+35,k)-.5)*1.2*U, hw=(.3+.95*fdHash(ep,seedK+36,k))*U;
        const op=(.35+.5*fdHash(ep,seedK+37,k))*(.7+.3*fdHash(frame,seedK+38,k)), light=lightOf(fdHash(ep,seedK+39,k));
        const part=fdHash(ep,seedK+40,k), ya=part<.7?0:Math.floor(fdHash(ep,seedK+41,k)*H*.5), yb=part<.7?H:Math.min(H,ya+Math.ceil(H*(.3+.5*fdHash(ep,seedK+42,k))));
        const wav=(fdHash(ep,seedK+43,k)-.5)*.006*W, wf=1+3*fdHash(ep,seedK+44,k);
        ink(light,op); fx.lineWidth=2*hw; fx.beginPath();
        for(let y=ya;y<=yb;y+=2){ const xc=cx+wav*Math.sin(TAU*wf*y/H); if(y===ya) fx.moveTo(xc,y); else fx.lineTo(xc,y); }
        fx.stroke();
      }
      const n=Math.floor(DUST*30+fdHash(frame,seedK+10,0));
      for(let i=0;i<n;i++){
        const h3=fdHash(frame,seedK+13,i), h4=fdHash(frame,seedK+14,i), cx=fdHash(frame,seedK+11,i)*W, cy=fdHash(frame,seedK+12,i)*H, r=(1+5*h3*h3*h3)*U, op=.55+.45*h4, light=lightOf(fdHash(frame,seedK+15,i));
        dot(cx,cy,r,op,light);
        if(h4>.7){ const a=6.2832*fdHash(frame,seedK+16,i); dot(cx+Math.cos(a)*r,cy+Math.sin(a)*r,r*.6,op,light); }
      }
      const nh=Math.floor(HAIR*3+fdHash(frame,seedK+20,0));
      for(let i=0;i<nh;i++){
        let x=fdHash(frame,seedK+21,i)*W, y=fdHash(frame,seedK+22,i)*H;
        const len=(.04+.1*fdHash(frame,seedK+23,i))*100, ang=fdHash(frame,seedK+24,i)*6.2832, bend=(fdHash(frame,seedK+25,i)-.5)*2.2, wig=fdHash(frame,seedK+27,i)*6.2832, hw=(.7+.8*fdHash(frame,seedK+26,i))*U;
        ink(lightOf(fdHash(frame,seedK+28,i)),.85); fx.lineWidth=2*hw; fx.beginPath(); fx.moveTo(x,y);
        for(let q=1;q<=12;q++){ const s=(q-.5)/12, th=ang+bend*(s-.5)*Math.PI+.35*Math.sin(wig+s*7); x+=Math.cos(th)*len/12; y+=Math.sin(th)*len/12; fx.lineTo(x,y); }
        fx.stroke();
      }
      fx.globalAlpha=1;
      /* 3. the lamp: Flicker, and a splice frame's pop, one multiply over all of it */
      let mul=1+FLK*(.32*(2*fdHash(frame,seedK+1,0)-1)+.08*Math.sin(TAU*frame/7.3)); if(spliced) mul*=1.25;
      c.drawImage(F,0,0,100,100);
      if(mul<1){ c.globalAlpha=1-mul; c.fillStyle='#000'; c.fillRect(0,0,100,100); }
      else if(mul>1){ c.globalCompositeOperation='lighter'; c.globalAlpha=Math.min(1,mul-1); c.drawImage(F,0,0,100,100); }
      reset(c,px);
    };
  } },

/* FRAME STUTTER. A comp sheet with the timeline under it. CANVAS_FX.framestutter, Hold + Trail at Frame rate 8 and Trail .45:
   each hold is the frame at its start, the hold before it drawn at 45 % underneath. The first pass plays with the effect off;
   on the way back it holds. The ruler is a second of 30 fps frames under a fixed playhead; holds group them in fours and threes. */
{ id:'framestutter', name:'Frame Stutter', section:'Stylize', isNew:true, still:3.06,
  line:'The layer holds each frame for a beat instead of playing every one, like stop-motion; Trail leaves a ghost of the frame before.',
  make(px){
    const P=4.4, RATE=8, TRAIL=.45, SD=25, ON0=2.25;
    const prog=u=>u<.3?0:u<1.9?E.inOut(seg(u,.3,1.9)):u<2.3?1:u<3.9?1-E.inOut(seg(u,2.3,3.9)):0;
    const pose=u=>{ const p=prog(u); return [lerp(19,81,p),41-17*Math.sin(Math.PI*p),p*Math.PI/2]; };
    const card=(c,q,a)=>{ c.save(); c.globalAlpha=a; c.translate(q[0],q[1]); c.rotate(q[2]); c.fillStyle=INK; c.fillRect(-SD/2,-SD/2,SD,SD); c.fillStyle=BONE; c.fillRect(-SD/2+2.6,-SD/2+2.6,5.4,5.4); c.restore(); };
    return (c,t)=>{
      const u=mod(t,P), on=u>=ON0; reset(c,px);
      c.fillStyle=VERM; c.fillRect(0,0,100,76);
      c.fillStyle=INK; c.fillRect(0,76,100,24);
      const cq=Math.floor(u*RATE+1e-9);
      if(on){ card(c,pose((cq-1)/RATE),TRAIL); card(c,pose(cq/RATE),1); }
      else card(c,pose(u),1);
      /* the timeline: 30 fps frames scrolling under a fixed playhead */
      const X0=33, CW=92/30, fNow=u*30;
      for(let n=Math.floor(fNow)-12;n<=Math.floor(fNow)+22;n++){
        const x=X0+(n-fNow)*CW; if(x<3||x>97-CW) continue;
        let a=.26;
        if(on){ const hq=Math.floor(n/30*RATE+1e-9); a=hq===cq?1:(hq%2?.46:.26); }
        else if(n===Math.floor(fNow)) a=1;
        c.globalAlpha=a; c.fillStyle=BONE; c.fillRect(x+.4,83,CW-.8,8.5);
      }
      c.globalAlpha=1; c.fillStyle=VERM; c.fillRect(X0-.4,79.5,.8,15.5);
      c.beginPath(); c.moveTo(X0-2,79); c.lineTo(X0+2,79); c.lineTo(X0,81.4); c.closePath(); c.fill();
      tab(c,4,4,on?'8 FPS':'30 FPS',4.4,INK,BONE);
    };
  } },

/* GLITTER. A diamond rivière on a jeweller's velvet neck form, drawn here (art director, ad: it was grey satin, the same
   material as Oil Slick's source). CANVAS_FX.glitter's own lattice (e1Hash, Spacing 24 px, Star size 48 px, Four points,
   Twinkle 1.5 Hz, the sin^3 pulse, 'lighter') on a 1080 comp: a star only lands where the pixel under it clears the Brightness bar,
   which steps 100 % (none), 74 % (the stones only), 52 % (the velvet's sheen joins in), then back. */
{ id:'glitter', name:'Glitter', section:'Stylize', isNew:true, still:2.38,
  line:'Small four-point stars twinkle on the bright parts of the picture only; lower the Brightness bar and they spread further.',
  make(px){
    const P=4, N=Math.min(px,320), SP=24, SZ=48, SPEED=1.5, K=10.8;
    const [F,fx]=canvasN(N); fx.setTransform(N/100,0,0,N/100,0,0);
    const bg=fx.createLinearGradient(0,0,100,100); bg.addColorStop(0,'#1c1b1f'); bg.addColorStop(1,'#09090a'); fx.fillStyle=bg; fx.fillRect(0,0,100,100);
    /* the neck form: a column rising out of the frame, sloping shoulders, deep blue velvet lit from high on the left */
    const BUST=new Path2D(); BUST.moveTo(35,-2); BUST.lineTo(65,-2); BUST.bezierCurveTo(64,20,64,33,67,42); BUST.bezierCurveTo(73,52,88,57,104,64);
    BUST.lineTo(104,104); BUST.lineTo(-4,104); BUST.lineTo(-4,64); BUST.bezierCurveTo(12,57,27,52,33,42); BUST.bezierCurveTo(36,33,36,20,35,-2); BUST.closePath();
    fx.save(); fx.clip(BUST);
    const ng=fx.createLinearGradient(33,0,67,0); ng.addColorStop(0,'#33446d'); ng.addColorStop(.18,'#5d6f9c'); ng.addColorStop(.45,'#1f2a4a'); ng.addColorStop(1,'#0c1122'); fx.fillStyle=ng; fx.fillRect(0,0,100,100);
    const sg=fx.createLinearGradient(0,44,0,100); sg.addColorStop(0,'rgba(10,15,32,0)'); sg.addColorStop(.35,'rgba(10,15,32,.55)'); sg.addColorStop(1,'rgba(6,9,20,.9)');
    fx.fillStyle=sg; fx.fillRect(0,44,100,60);
    /* the velvet's sheen where it turns away: brightest on the left shoulder's crest and the neck's left edge */
    fx.lineCap='round'; fx.strokeStyle='rgba(150,166,210,.55)'; fx.lineWidth=2.6;
    fx.beginPath(); fx.moveTo(-4,64.6); fx.bezierCurveTo(12,57.6,27,52.6,33.4,43); fx.bezierCurveTo(36.2,34,36.2,20,35.4,-2); fx.stroke();
    fx.strokeStyle='rgba(200,212,240,.55)'; fx.lineWidth=1; fx.beginPath(); fx.moveTo(4,61.2); fx.bezierCurveTo(14,57,25,53,31.5,46); fx.stroke();
    fx.strokeStyle='rgba(120,136,180,.25)'; fx.lineWidth=2; fx.beginPath(); fx.moveTo(104,64.6); fx.bezierCurveTo(88,57.6,73,52.6,66.6,43); fx.stroke();
    const RV=rng(73); for(let i=0;i<900;i++){ fx.fillStyle=RV()<.5?'rgba(255,255,255,.03)':'rgba(0,0,0,.06)'; fx.fillRect(RV()*100,RV()*100,.35,.35); }
    fx.restore();
    /* the necklace: stones evenly spaced along its drape, largest at the front, a pear drop hanging from the middle */
    const A0=[36.2,39], A1=[63.8,39], CP=[50,80], bz=s=>[(1-s)*(1-s)*A0[0]+2*(1-s)*s*CP[0]+s*s*A1[0],(1-s)*(1-s)*A0[1]+2*(1-s)*s*CP[1]+s*s*A1[1]];
    const along=(f,NST,r0,r1)=>{ const out=[]; let prev=f(0), acc=0; const tab2=[[0,0]]; for(let i=1;i<=400;i++){ const q=f(i/400); acc+=Math.hypot(q[0]-prev[0],q[1]-prev[1]); tab2.push([i/400,acc]); prev=q; }
      for(let k=0;k<NST;k++){ const want=acc*(k+.5)/NST; let j=1; while(j<tab2.length-1&&tab2[j][1]<want) j++; const s=tab2[j][0]; out.push({p:f(s),r:r0+r1*Math.sin(Math.PI*s)}); } return out; };
    const pts=along(bz,19,1.15,.75);
    /* a second, finer row inside the first: a double rivière */
    const B0=[36.4,38.2], B1=[63.6,38.2], CQ=[50,68.5], bz2=s=>[(1-s)*(1-s)*B0[0]+2*(1-s)*s*CQ[0]+s*s*B1[0],(1-s)*(1-s)*B0[1]+2*(1-s)*s*CQ[1]+s*s*B1[1]];
    const pts2=along(bz2,21,.7,.38);
    const stone=(x,y,r)=>{ fx.fillStyle='#7e8591'; fx.beginPath(); fx.arc(x,y,r+.38,0,TAU); fx.fill();
      const g=fx.createRadialGradient(x-r*.3,y-r*.35,0,x,y,r); g.addColorStop(0,'#ffffff'); g.addColorStop(.42,'#e6ecf4'); g.addColorStop(.78,'#9aa6b9'); g.addColorStop(1,'#eef2f8');
      fx.fillStyle=g; fx.beginPath(); fx.arc(x,y,r,0,TAU); fx.fill();
      fx.strokeStyle='rgba(110,124,150,.55)'; fx.lineWidth=.12; fx.beginPath(); for(let a=0;a<4;a++){ const q=a*Math.PI/4+.3; fx.moveTo(x+Math.cos(q)*r*.9,y+Math.sin(q)*r*.9); fx.lineTo(x-Math.cos(q)*r*.9,y-Math.sin(q)*r*.9); } fx.stroke(); };
    fx.strokeStyle='rgba(0,0,0,.5)'; fx.lineWidth=1.6; fx.beginPath(); pts.forEach((q,i)=>i?fx.lineTo(q.p[0]+.6,q.p[1]+.9):fx.moveTo(q.p[0]+.6,q.p[1]+.9)); fx.stroke();
    fx.strokeStyle='#8d94a0'; fx.lineWidth=.45; for(const f of [bz2,bz]){ fx.beginPath(); fx.moveTo(f(0)[0],f(0)[1]); for(let i=1;i<=60;i++){ const q=f(i/60); fx.lineTo(q[0],q[1]); } fx.stroke(); }
    for(const q of pts2) stone(q.p[0],q.p[1],q.r);
    for(const q of pts) stone(q.p[0],q.p[1],q.r);
    { const lo=bz(.5), dx=lo[0], dy=lo[1]+2.4;   /* the drop: a bail, then a pear-cut stone */
      fx.fillStyle='#7e8591'; fx.fillRect(dx-.35,lo[1]+1,.7,1.8);
      fx.save(); fx.translate(dx,dy+2.6); fx.beginPath(); fx.moveTo(0,-3.4); fx.bezierCurveTo(2.6,-1.2,2.5,2.4,0,2.6); fx.bezierCurveTo(-2.5,2.4,-2.6,-1.2,0,-3.4); fx.closePath();
      fx.fillStyle='#7e8591'; fx.lineWidth=.7; fx.strokeStyle='#7e8591'; fx.stroke();
      const g=fx.createRadialGradient(-.7,-.9,0,0,0,3); g.addColorStop(0,'#ffffff'); g.addColorStop(.45,'#e3e9f2'); g.addColorStop(.8,'#97a3b6'); g.addColorStop(1,'#eef2f8'); fx.fillStyle=g; fx.fill(); fx.restore(); }
    fx.setTransform(1,0,0,1,0,0);
    const D=fx.getImageData(0,0,N,N).data;
    const lumAt=(x,y)=>{ const i=(clamp(Math.floor(y*N/100),0,N-1)*N+clamp(Math.floor(x*N/100),0,N-1))*4; return (.299*D[i]+.587*D[i+1]+.114*D[i+2])/255; };
    const stars=[], n=Math.ceil(1080/SP);
    for(let iy=-1;iy<=n;iy++) for(let ix=-1;ix<=n;ix++){ const k=Math.imul(ix,73856093)^Math.imul(iy,19349663), sx=(ix+e1(k+1))*SP, sy=(iy+e1(k+2))*SP, xi=Math.round(sx), yi=Math.round(sy);
      if(xi<0||yi<0||xi>=1080||yi>=1080) continue; stars.push({x:sx/K,y:sy/K,L:lumAt(xi/K,yi/K),ph:e1(k+3),sz:e1(k+4)}); }
    const bar=u=>u<.55?1:u<1.9?.74:u<3.35?.52:1;
    return (c,t)=>{
      const u=mod(t,P), thr=bar(u); reset(c,px);
      c.drawImage(F,0,0,100,100);
      c.globalCompositeOperation='lighter'; c.lineCap='round';
      for(const s of stars){ if(s.L<thr) continue;
        const tw=Math.sin(TAU*(SPEED*u+s.ph)), br=tw>0?tw*tw*tw:0; if(br<.02) continue;
        const R=SZ*(.5+.5*s.sz)*(.35+.65*br)/K;
        const g=c.createRadialGradient(s.x,s.y,0,s.x,s.y,R*.5); g.addColorStop(0,'rgba(255,255,255,'+Math.min(1,br).toFixed(3)+')'); g.addColorStop(1,'rgba(255,255,255,0)');
        c.fillStyle=g; c.beginPath(); c.arc(s.x,s.y,R*.5,0,TAU); c.fill();
        c.strokeStyle='rgba(255,255,255,'+Math.min(1,br*.9).toFixed(3)+')'; c.lineWidth=Math.max(100/1080,R*.07);
        c.beginPath(); c.moveTo(s.x-R,s.y); c.lineTo(s.x+R,s.y); c.moveTo(s.x,s.y-R*.7); c.lineTo(s.x,s.y+R*.7); c.stroke();
      }
      c.globalCompositeOperation='source-over';
      tab(c,4,91,'BAR '+Math.round(thr*100)+'%',4.2,INK,BONE);
    };
  } },

/* LETTERBOX. A two-ink print (teal and yellow, multiplied, 0.7 units out of register) of a figure at the end of a jetty.
   PIXEL_FX.letterbox, Bars colour Ink: Size keyed 0 to 29.1 % with an overshoot (the 2.39:1 bar on a square frame), held, then
   Shape cut to 4:5 (the kernel turns that into side bars of 10 %), then off. */
{ id:'letterbox', name:'Letterbox', section:'Stylize', isNew:true, still:1.9,
  line:'Bars close in over the top and bottom of the picture for a widescreen shape, or at the sides for a tall one.',
  make(px){
    const P=4.4, R239=(100-100/2.39)/2, K=px/100;
    const JETTY=[3,101, 36,101, 62.6,58.6, 57.4,58.6];
    const plate=(paint,ox,oy,seed)=>{ const [C,x]=canvasN(px); x.setTransform(K,0,0,K,ox*K,oy*K); paint(x);
      /* Riso speckle: paper showing through the ink */
      const R=rng(seed); x.globalCompositeOperation='destination-out'; x.fillStyle='#000';
      for(let i=0;i<900;i++){ x.globalAlpha=.25+.6*R(); x.beginPath(); x.arc(R()*104-2,R()*104-2,.12+.22*R(),0,TAU); x.fill(); }
      x.globalAlpha=1; x.globalCompositeOperation='destination-out'; poly(x,JETTY); x.fill(); x.globalCompositeOperation='source-over'; return C; };
    const yel=plate(x=>{ x.fillStyle=RYEL; x.fillRect(-2,-2,104,59);
      const R=rng(41); for(let i=0;i<16;i++){ const y=60+i*2.6+R()*1.2, w=6+R()*22, x0=R()*100-w/2; x.fillRect(x0,y,w,.5+R()*.7); } },0,0,7);
    const teal=plate(x=>{ x.fillStyle=RTEAL; x.fillRect(-2,57,104,46);
      poly(x,[67,57.2, 73,55.4, 80,53.7, 88,52.9, 95,53.7, 103,54.8, 103,57.2]); x.fill();
      /* a figure in a long coat, a little turned: head, collar, coat to the knee, two legs */
      x.beginPath(); x.ellipse(60.1,41.9,1.75,2.05,0,0,TAU); x.fill();
      poly(x,[59.3,43.6, 60.9,43.6, 61.1,44.5, 62.3,45.2, 62.9,49.6, 63.3,54.2, 61.9,54.5, 61.6,58.7, 60.6,58.7, 60.4,54.6, 59.9,54.6, 59.6,58.7, 58.6,58.7, 58.5,54.5, 57.1,54.1, 57.7,49.4, 58.1,45.1, 59.1,44.5]); x.fill(); },.7,.35,19);
    const [PIC,pc]=canvasN(px); pc.fillStyle=BONE; pc.fillRect(0,0,px,px);
    pc.globalCompositeOperation='multiply'; pc.drawImage(yel,0,0); pc.drawImage(teal,0,0); pc.globalCompositeOperation='source-over';
    /* the jetty's shaded face, in teal */
    pc.setTransform(K,0,0,K,.7*K,.35*K); pc.globalCompositeOperation='multiply'; pc.fillStyle=RTEAL; poly(pc,[36,101, 40,101, 62.8,59.2, 62.6,58.6]); pc.fill(); pc.globalCompositeOperation='source-over';
    return (c,t)=>{
      const u=mod(t,P); reset(c,px); c.drawImage(PIC,0,0,100,100);
      let top=0, side=0, lab='';
      if(u>=.6&&u<2.55){ top=R239*settle(seg(u,.6,1.2)); if(u>=1.2) lab='2.39:1'; }
      else if(u>=2.55&&u<3.65){ side=10; lab='4:5'; }
      c.fillStyle=INK;
      if(top>.05){ c.fillRect(0,0,100,top); c.fillRect(0,100-top,100,top); }
      if(side){ c.fillRect(0,0,side,100); c.fillRect(100-side,0,side,100); }
      if(lab) tab(c,3,92,lab,4.4,BONE,INK);
    };
  } },

/* LIQUID GLASS. CANVAS_FX.liquidglass step for step on a striped capsule: the layer's own picture blurred by Frost 24 px (three box
   passes standing in for the canvas blur, then saturate 1.25 and brightness 1.06), Clarity 35 % of the sharp layer back over it,
   clipped to the layer, white Tint 12 %, the Sheen gradient at 80 %, the Edge crescents (14 px) light and dark along the Light angle.
   Amount travels 0 to 1; Light angle goes 135 to 45 degrees on twos. The ground behind is untouched: the effect does not see it. */
{ id:'liquidglass', name:'Liquid Glass', section:'Stylize', isNew:true, still:1.8,
  line:'The layer turns to frosted glass: its own picture softens, a sheen crosses it and its edge catches the light.',
  make(px){
    const P=4.6, G=Math.min(px,360), k=G/100, FROST=24, EDGE=14, CLAR=.35, SHEEN=.8, TINT=.12;
    /* the card, turned 6 degrees; the sheen is laid across its axis-aligned box, as the kernel lays it across the alpha box */
    /* a capsule layer, turned 9 degrees; the sheen is laid across its axis-aligned box, as the kernel lays it across the alpha box */
    const CX0=49, CY0=49, CW=88, CH=48, RAD=24, ROT=-9*TAU/360, hx=CW/2*Math.cos(ROT)+CH/2*Math.abs(Math.sin(ROT)), hy=CW/2*Math.abs(Math.sin(ROT))+CH/2*Math.cos(ROT);
    const BX=CX0-hx, BY=CY0-hy, BW=2*hx, BH=2*hy;
    const content=x=>{ x.save(); x.translate(CX0,CY0); x.rotate(ROT); x.beginPath(); x.roundRect(-CW/2,-CH/2,CW,CH,RAD); x.clip();
      /* stripes that widen from left to right, so the frost visibly flattens the fine ones and only softens the broad ones */
      let sx=-CW/2-2, i=0; while(sx<CW/2+2){ const w=1.3+6.2*Math.pow(clamp((sx+CW/2)/CW),1.4); x.fillStyle=(i%2)?BONE:VERM; x.fillRect(sx,-CH/2,w,CH); sx+=w; i++; }
      x.restore(); };
    const [AF,af]=canvasN(px); af.setTransform(px/100,0,0,px/100,0,0); content(af);
    const [AG,ag]=canvasN(G); ag.setTransform(k,0,0,k,0,0); content(ag); ag.setTransform(1,0,0,1,0,0);
    const src=ag.getImageData(0,0,G,G).data;
    const sig=FROST*G/1080, r=Math.max(1,Math.round(Math.sqrt(sig*sig+.25)-.5));
    const ch=[0,1,2,3].map(q=>{ const a=new Float32Array(G*G); for(let i=0;i<G*G;i++) a[i]=q===3?src[i*4+3]:src[i*4+q]*src[i*4+3]/255; return boxPass(boxPass(boxPass(a,G,G,r),G,G,r),G,G,r); });
    const [BL,bl]=canvasN(G), bim=bl.createImageData(G,G), bd=bim.data, S=1.25;
    for(let i=0;i<G*G;i++){ const al=ch[3][i]; if(al<.5) continue; const R=ch[0][i]*255/al, Gc=ch[1][i]*255/al, B=ch[2][i]*255/al;
      bd[i*4]=1.06*((.213+.787*S)*R+(.715-.715*S)*Gc+(.072-.072*S)*B); bd[i*4+1]=1.06*((.213-.213*S)*R+(.715+.285*S)*Gc+(.072-.072*S)*B); bd[i*4+2]=1.06*((.213-.213*S)*R+(.715-.715*S)*Gc+(.072+.928*S)*B); bd[i*4+3]=al; }
    bl.putImageData(bim,0,0);
    const [BASE,bs]=canvasN(G);
    bs.drawImage(BL,0,0); bs.globalAlpha=CLAR; bs.drawImage(AG,0,0); bs.globalAlpha=1;
    bs.globalCompositeOperation='destination-in'; bs.drawImage(AG,0,0);
    bs.globalCompositeOperation='source-atop'; bs.fillStyle='rgba(255,255,255,'+TINT+')'; bs.fillRect(0,0,G,G); bs.globalCompositeOperation='source-over';
    const cache=new Map(), [T2,t2]=canvasN(G);
    const glass=deg=>{ if(cache.has(deg)) return cache.get(deg);
      const [C,g1]=canvasN(G); g1.drawImage(BASE,0,0);
      const a=deg*TAU/360, cx=(BX+BW/2)*k, cy=(BY+BH/2)*k, R=Math.hypot(BW,BH)/2*k, gx=Math.cos(a)*R, gy=Math.sin(a)*R;
      const gr=g1.createLinearGradient(cx-gx,cy-gy,cx+gx,cy+gy);
      gr.addColorStop(0,'rgba(255,255,255,'+(.42*SHEEN).toFixed(3)+')'); gr.addColorStop(.34,'rgba(255,255,255,'+(.06*SHEEN).toFixed(3)+')'); gr.addColorStop(.52,'rgba(255,255,255,0)'); gr.addColorStop(.74,'rgba(255,255,255,'+(.16*SHEEN).toFixed(3)+')'); gr.addColorStop(1,'rgba(255,255,255,0)');
      g1.globalCompositeOperation='source-atop'; g1.fillStyle=gr; g1.fillRect(0,0,G,G); g1.globalCompositeOperation='source-over';
      const dx=Math.cos(a)*EDGE*G/1080, dy=Math.sin(a)*EDGE*G/1080;
      for(const [ox,oy,col,al] of [[-dx,-dy,'#ffffff',.55],[dx,dy,'#000000',.3]]){
        t2.globalCompositeOperation='source-over'; t2.globalAlpha=1; t2.clearRect(0,0,G,G); t2.drawImage(AG,0,0);
        t2.globalCompositeOperation='destination-out'; t2.drawImage(AG,ox,oy);
        t2.globalCompositeOperation='source-in'; t2.fillStyle=col; t2.fillRect(0,0,G,G); t2.globalCompositeOperation='source-over';
        g1.globalCompositeOperation='source-atop'; g1.globalAlpha=al; g1.drawImage(T2,0,0); g1.globalAlpha=1; g1.globalCompositeOperation='source-over';
      }
      if(cache.size>14) cache.clear(); cache.set(deg,C); return C; };
    return (c,t)=>{
      const u=mod(t,P);
      const amt = u<.6?0 : u<1.3? E.inOut(seg(u,.6,1.3)) : u<3.75?1 : u<4.35? 1-E.inOut(seg(u,3.75,4.35)) : 0;
      const st=Math.floor(u*12)/12;
      const deg = u<2.1||u>=4.35 ? 135 : Math.round(lerp(135,45,E.inOut(seg(st,2.1,2.8)))/9)*9;
      reset(c,px); c.fillStyle=COAL; c.fillRect(0,0,100,100);
      c.drawImage(AF,0,0,100,100);
      if(amt>.004){ c.globalAlpha=amt; c.drawImage(glass(deg),0,0,100,100); c.globalAlpha=1; }
      c.font=MONO(4.2); c.fillStyle=DIM; c.textAlign='left'; c.textBaseline='middle'; c.fillText('LIGHT '+deg+'°',4,92);
    };
  } },

/* BACKDROP LENS. Two-ink print. drawCopyBg with copyBgZoom: a text layer's footprint is filled with the scene behind it, scaled about
   the layer's own anchor (the word's centre, on the barcode). Zoom 1 is a plain copy, so the word cannot be seen; it rises to 2 with
   an overshoot, then 3, and comes back. Nothing else is drawn: no rim, no shadow, no outline round the letters. */
{ id:'magnifybg', name:'Backdrop Lens', section:'Stylize', isNew:true, still:3.2,
  line:'The layer shows whatever is behind it, enlarged: here a word filled with the label underneath at two, then three times the size.',
  make(px){
    const P=4.6, AX=LBL_X, AY=LBL_Y, K=px/100, WORD='SCAN';
    const [BG,bg]=canvasN(px); bg.setTransform(K,0,0,K,0,0); paintLabel(bg);
    const [MK,mk]=canvasN(px); mk.setTransform(K,0,0,K,0,0); mk.font=SANS(30); const w=mk.measureText(WORD).width, fs=30*88/w;
    mk.font=SANS(fs); mk.textAlign='center'; mk.textBaseline='middle'; mk.fillStyle='#fff'; mk.fillText(WORD,AX,AY+fs*.03);
    /* only the band the word sits in is worked each frame */
    const B0=Math.max(0,Math.floor((AY-fs*.5)*K)), BH=Math.min(px,Math.ceil((AY+fs*.5)*K))-B0, [SC,sc]=canvasN(px,BH);
    return (c,t)=>{
      const u=mod(t,P);
      const z = u<.6?1 : u<1.45? 1+settle(seg(u,.6,1.45)) : u<2.45?2 : u<2.95? 2+E.inOut(seg(u,2.45,2.95)) : u<3.75?3 : u<4.3? 3-2*E.inOut(seg(u,3.75,4.3)) : 1;
      reset(c,px); c.drawImage(BG,0,0,100,100);
      if(Math.abs(z-1)>.002){
        sc.setTransform(1,0,0,1,0,0); sc.globalCompositeOperation='source-over'; sc.globalAlpha=1; sc.clearRect(0,0,px,BH); sc.drawImage(MK,0,-B0);
        sc.globalCompositeOperation='source-in'; sc.setTransform(z,0,0,z,AX*K*(1-z),AY*K*(1-z)-B0); sc.drawImage(BG,0,0);
        sc.setTransform(1,0,0,1,0,0); sc.globalCompositeOperation='source-over';
        c.setTransform(1,0,0,1,0,0); c.drawImage(SC,0,B0); reset(c,px);
      }
      tab(c,80,91,z.toFixed(1)+'×',4.4,INK,BONE);
    };
  } }

);
})();
