/* FreeMotion effect pictures, artist 25 (c25): the five Opacity / Visibility effects still without a picture.
   No photographs: every subject is made here. Each tile runs its effect's own maths from js/compositor.js; see each note. */
(function(){ 'use strict';
const {TAU,clamp,lerp,seg,E,rng,hash,vnoise,canvasOf}=window.FXK;

const BONE='#e7e2d5', INK='#16130f', COAL='#0c0c0d', NAVY='#161c28', HAIR='#2b3547', TEXT='#eef2f8', DIM='#8b96a8', VERM='#e4471d', YEL='#ffce4a', TEAL='#29d9bb';
const MONO=s=>'bold '+s+'px "Courier Prime","Courier New",monospace';
const mod=(t,P)=>((t%P)+P)%P;
const reset=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; };
const raw=c=>{ c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; };
const sheet=(w,h)=>{ const C=document.createElement('canvas'); C.width=w; C.height=h===undefined?w:h; return [C,C.getContext('2d')]; };
const poly=(c,p)=>{ c.beginPath(); for(let i=0;i<p.length;i+=2){ i?c.lineTo(p[i],p[i+1]):c.moveTo(p[i],p[i+1]); } c.closePath(); };
const quad=(c,pts)=>{ c.beginPath(); pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1])); c.closePath(); };
const tab=(c,x,y,txt,s,bg,fg)=>{ c.font=MONO(s); const w=c.measureText(txt).width; c.fillStyle=bg; c.fillRect(x,y,w+s*.9,s*1.5); c.fillStyle=fg; c.textBaseline='middle'; c.textAlign='left'; c.fillText(txt,x+s*.45,y+s*.8); return w+s*.9; };
const p2=v=>(v<10?'0':'')+v;

/* Block Fade's layer: an airliner parked on its stand, straight down from the news helicopter, 1080 x 864 (100 x 80 units).
   Concrete with no slab joints, so nothing in the picture looks like the effect's blocks. The plane's tail is the one accent. */
function paintApron(px){
  const LH=80, [C,g]=sheet(px,Math.round(px*LH/100)); g.setTransform(px/100,0,0,px/100,0,0);
  const R=rng(53);
  g.fillStyle='#a3a49f'; g.fillRect(0,0,100,LH);
  /* the concrete's weathering: broad pale and dark washes, then grit */
  for(let i=0;i<26;i++){ const x=R()*100, y=R()*LH, rx=6+R()*18, ry=3+R()*9, a=R()*TAU, dark=R()<.6;
    g.save(); g.translate(x,y); g.rotate(a); g.scale(rx,ry); const gr=g.createRadialGradient(0,0,0,0,0,1);
    gr.addColorStop(0,dark?'rgba(70,68,60,.10)':'rgba(214,214,206,.12)'); gr.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=gr; g.fillRect(-1,-1,2,2); g.restore(); }
  for(let i=0;i<5200;i++){ const v=R(); g.fillStyle=v<.5?'rgba(60,58,54,.22)':'rgba(236,235,228,.22)'; g.fillRect(R()*100,R()*LH,.22+R()*.3,.22+R()*.3); }
  const CX=51, CY=42.5, TH=-38*TAU/360, PS=1.13;   /* PS: the plane's scale, so it fills the frame and its right wing runs off the bottom */
  /* the stand's lead-in line, yellow with its black border, and the tyre rubber along it */
  g.save(); g.translate(CX,CY); g.rotate(TH); g.scale(PS,PS);
  const lead=()=>{ g.beginPath(); g.moveTo(-96,40); g.quadraticCurveTo(-66,0,-40,0); g.lineTo(50,0); };
  g.lineCap='butt'; g.strokeStyle='rgba(40,38,34,.16)'; g.lineWidth=5.2; lead(); g.stroke();
  g.strokeStyle='#1d1c1a'; g.lineWidth=1.9; lead(); g.stroke();
  g.strokeStyle='#e0ae35'; g.lineWidth=.95; lead(); g.stroke();
  g.fillStyle='#1d1c1a'; g.fillRect(49.4,-5.4,2.2,10.8); g.fillStyle='#e0ae35'; g.fillRect(49.85,-4.95,1.3,9.9);   /* stop bar */
  g.restore();
  /* the plane, nose to the upper right; drawn in its own frame, nose toward +x */
  const fus=()=>{ g.beginPath(); g.moveTo(43,0); g.quadraticCurveTo(42.6,-3.6,36,-3.75); g.lineTo(-27,-3.75); g.lineTo(-43.2,-1.05); g.quadraticCurveTo(-44.6,0,-43.2,1.05); g.lineTo(-27,3.75); g.lineTo(36,3.75); g.quadraticCurveTo(42.6,3.6,43,0); g.closePath(); };
  const wing=s=>poly(g,[10,s*3.6, -13.4,s*36.6, -18.6,s*37.2, -9.4,s*12.6, -11.4,s*3.6]);
  const stab=s=>poly(g,[-29.6,s*3.2, -38.4,s*15.2, -41.6,s*15.4, -40.4,s*2.2]);
  const eng=s=>{ g.beginPath(); g.moveTo(12,s*12.5-2.3); g.lineTo(1,s*12.5-2.1); g.lineTo(1,s*12.5+2.1); g.lineTo(12,s*12.5+2.3); g.closePath(); };
  const silhouette=()=>{ fus(); g.fill(); for(const s of [-1,1]){ wing(s); g.fill(); stab(s); g.fill(); eng(s); g.fill(); } };
  /* its shadow, the sun high and to the upper left */
  g.save(); g.translate(CX+2.2,CY+2.9); g.rotate(TH); g.scale(PS,PS); g.fillStyle='rgba(28,27,24,.34)'; silhouette(); g.restore();
  g.save(); g.translate(CX,CY); g.rotate(TH); g.scale(PS,PS);
  for(const s of [-1,1]){
    g.fillStyle='#b4b7b9'; eng(s); g.fill();
    g.fillStyle='#2a2e31'; g.fillRect(11.2,s*12.5-2.25,.8,4.5);                                   /* intake */
    g.fillStyle='#d8dadb'; wing(s); g.fill();
    g.strokeStyle='rgba(70,76,82,.55)'; g.lineWidth=.22;                                          /* flap and spoiler lines */
    g.beginPath(); g.moveTo(-8.4,s*4.2); g.lineTo(-14.6,s*30.5); g.moveTo(-6.2,s*4.2); g.lineTo(-7.6,s*12.2); g.stroke();
    g.fillStyle=VERM; poly(g,[-13.4,s*36.6, -18.6,s*37.2, -18.9,s*37.9, -13.7,s*37.3]); g.fill();  /* wing tips */
    g.fillStyle='#d3d5d6'; stab(s); g.fill();
  }
  const gr=g.createLinearGradient(0,-3.75,0,3.75); gr.addColorStop(0,'#fbfaf6'); gr.addColorStop(.45,'#f1efe9'); gr.addColorStop(1,'#cfccc4');
  g.fillStyle=gr; fus(); g.fill();
  g.fillStyle=VERM; poly(g,[-30.5,-.75, -44,-.5, -44,.5, -30.5,.75]); g.fill();                    /* the fin, seen edge-on from above */
  g.fillStyle='#22272b'; poly(g,[40.3,-1.8, 38.4,-3.0, 37.6,-2.4, 39.1,0, 37.6,2.4, 38.4,3.0, 40.3,1.8]); g.fill();   /* flight deck windows */
  g.restore();
  return C;
}

/* Flash (darken)'s picture: a launderette at night, three front loaders seen straight on, the row cropped by both edges. Lit by one
   tube off the top left. The shirt turning in the middle drum is the one accent. */
function paintLaundry(px){
  const [C,g]=canvasOf(px), R=rng(77), FLOOR=86, TOP=31, MW=36, GAP=1.2;
  /* the wall: municipal green tiles, each a touch different, grout between */
  g.fillStyle='#a2b9a8'; g.fillRect(0,0,100,FLOOR);
  const TS=4.6;
  for(let y=0;y<FLOOR;y+=TS) for(let x=-1.6;x<100;x+=TS){ const v=R(); if(v<.34){ g.fillStyle='rgba(250,252,240,'+(.05+R()*.08).toFixed(3)+')'; g.fillRect(x,y,TS,TS); } else if(v>.82){ g.fillStyle='rgba(30,50,40,.07)'; g.fillRect(x,y,TS,TS); } }
  g.fillStyle='rgba(70,92,80,.6)'; for(let y=0;y<FLOOR;y+=TS) g.fillRect(0,y,100,.3); for(let x=-1.6;x<100;x+=TS) g.fillRect(x,0,.3,FLOOR);
  /* the notice, taped up: a card of unreadable small print */
  g.save(); g.translate(78,16); g.rotate(2.5*TAU/360);
  g.fillStyle='rgba(30,40,34,.25)'; g.fillRect(-6.6,-8.2,14,18);
  g.fillStyle='#ece8dc'; g.fillRect(-7,-8.8,14,18);
  g.fillStyle='#55534d'; g.fillRect(-5,-6.6,10,1.6); for(let i=0;i<6;i++){ g.fillRect(-5,-3.2+i*1.9,4+R()*6,.55); }
  g.fillStyle='rgba(235,232,200,.75)'; g.fillRect(-2.2,-10,4.4,2.4);
  g.restore();
  /* light falloff from the tube */
  const lg=g.createLinearGradient(8,0,96,FLOOR); lg.addColorStop(0,'rgba(255,255,240,.12)'); lg.addColorStop(1,'rgba(14,24,20,.36)'); g.fillStyle=lg; g.fillRect(0,0,100,FLOOR);
  /* the tube's fitting along the top edge */
  g.fillStyle='#5f625e'; g.fillRect(-2,0,61,3.4); g.fillStyle='#f7f8ef'; g.fillRect(0,0,57.5,2.4);
  /* the floor: grey terrazzo, chips of white and black */
  g.fillStyle='#6f6c65'; g.fillRect(0,FLOOR,100,100-FLOOR);
  for(let i=0;i<700;i++){ const v=R(); g.fillStyle=v<.45?'rgba(230,226,214,.5)':v<.85?'rgba(28,26,24,.45)':'rgba(150,80,60,.45)'; g.fillRect(R()*100,FLOOR+R()*(100-FLOOR),.25+R()*.35,.25+R()*.35); }
  g.fillStyle='rgba(0,0,0,.35)'; g.fillRect(0,FLOOR,100,1.2);
  /* the machines */
  const CLOTH=['#2f4366',VERM,'#d6ccb2'];
  for(let m=0;m<3;m++){ const x=-9+m*(MW+GAP), cx=x+MW/2, cy=63, cl=CLOTH[m];
    const bg=g.createLinearGradient(x,TOP,x+MW,FLOOR); bg.addColorStop(0,'#f2efe7'); bg.addColorStop(1,'#cfcbc1');
    g.fillStyle=bg; g.fillRect(x,TOP,MW,FLOOR-TOP);
    g.fillStyle='#d3cfc4'; g.fillRect(x,TOP,MW,9); g.fillStyle='#a9a59b'; g.fillRect(x,TOP+9,MW,.45); g.fillStyle='#fbfaf5'; g.fillRect(x,TOP,MW,.5);
    g.fillStyle='#2b2d2e'; g.fillRect(x+4,TOP+2.4,7,4.6); g.fillStyle='#8c8f90'; g.fillRect(x+7.2,TOP+3.1,.7,3.2);          /* coin box and slot */
    g.fillStyle='#3a3d3f'; g.fillRect(x+14,TOP+3,8,3.2); g.fillStyle='#b8d7c4'; g.fillRect(x+15,TOP+4.2,1.6,.9); g.fillRect(x+17.6,TOP+4.2,1.6,.9); g.fillRect(x+20.2,TOP+4.2,.9,.9);   /* the time display */
    g.fillStyle='#bdb9ae'; g.beginPath(); g.arc(x+29,TOP+4.6,2.7,0,TAU); g.fill(); g.fillStyle='#e9e6dd'; g.beginPath(); g.arc(x+28.8,TOP+4.4,2.1,0,TAU); g.fill();
    g.strokeStyle='#5d5f60'; g.lineWidth=.45; g.beginPath(); g.moveTo(x+28.8,TOP+4.4); g.lineTo(x+30.2,TOP+3.1); g.stroke();
    g.fillStyle='#bab6ab'; g.fillRect(x,FLOOR-3.4,MW,3.4);                                                                   /* kick plate */
    /* the door: chrome ring, dark bezel, glass onto the drum */
    g.fillStyle='rgba(40,40,36,.22)'; g.beginPath(); g.arc(cx+.8,cy+1,13.4,0,TAU); g.fill();
    g.fillStyle='#c6c9cb'; g.beginPath(); g.arc(cx,cy,13.1,0,TAU); g.fill();
    g.fillStyle='#e8eaeb'; g.beginPath(); g.arc(cx,cy,13.1,Math.PI*1.05,Math.PI*1.6); g.lineTo(cx,cy); g.fill();
    g.fillStyle='#565d62'; g.beginPath(); g.arc(cx,cy,11.2,0,TAU); g.fill();
    g.save(); g.beginPath(); g.arc(cx,cy,10.1,0,TAU); g.clip();
    g.fillStyle='#1c2226'; g.fillRect(cx-11,cy-11,22,22);
    g.fillStyle='#2b3237'; for(let a=0;a<3;a++) for(let i=0;i<14;i++){ const ang=i/14*TAU+a*.2, rr=4+a*2.6; g.fillRect(cx+Math.cos(ang)*rr-.3,cy+Math.sin(ang)*rr-.3,.6,.6); }
    /* the load, slumped to the bottom of the drum, with a fold or two */
    const tilt=(m-1)*1.6;
    g.fillStyle=cl; g.beginPath(); g.moveTo(cx-11,cy+1.5+tilt); g.bezierCurveTo(cx-6,cy-2.6+tilt,cx-1,cy+2.8,cx+3,cy-.6); g.bezierCurveTo(cx+6,cy-3.2-tilt,cx+9,cy+.8-tilt,cx+11,cy-1-tilt); g.lineTo(cx+11,cy+11); g.lineTo(cx-11,cy+11); g.closePath(); g.fill();
    g.strokeStyle='rgba(0,0,0,.28)'; g.lineWidth=.55; g.beginPath(); g.moveTo(cx-6,cy+2.4+tilt*.5); g.quadraticCurveTo(cx-2,cy+5,cx+1,cy+8); g.moveTo(cx+4,cy+1.4); g.quadraticCurveTo(cx+6.5,cy+4,cx+5.5,cy+8.5); g.stroke();
    g.fillStyle='rgba(0,0,0,.25)'; g.fillRect(cx-11,cy+6,22,5);
    /* the glass: one hard reflection of the tube, nothing more */
    g.fillStyle='rgba(235,240,236,.17)'; poly(g,[cx-9,cy-3.5, cx-3.5,cy-9, cx-1.5,cy-9, cx-9,cy-1.5]); g.fill();
    g.restore();
    g.fillStyle='#4a4f53'; g.fillRect(cx+12.1,cy-3.6,1.5,7.2);                                                              /* handle */
    /* the gap to the next machine */
    g.fillStyle='#23292a'; g.fillRect(x+MW,TOP,GAP,FLOOR-TOP);
  }
  /* their faint reflection in the floor */
  g.save(); g.globalAlpha=.1; g.fillStyle='#f2efe7'; for(let m=0;m<3;m++){ g.fillRect(-9+m*(MW+GAP),FLOOR+1.2,MW,5); } g.restore();
  return C;
}

window.FX_TILES.push(

/* STROBE. Cut paper: a level-crossing signal at night, ink board, bone border and crossbuck, vermilion lamps. Each lit lamp is its
   own layer over the board's dark lens, and each carries a Strobe at Rate 1 (one blink a second) and On for 50 %, the defaults:
   blink's hz branch, (seconds x Rate + Offset) mod 1 < On for. The right lamp's Offset is 0.5, the control that lets two blinking
   layers alternate, so they take turns. Hard cuts, nothing in between, because Softness is 0. */
{ id:'blink', name:'Strobe', section:'Opacity / Visibility', isNew:true, still:.25,
  line:'Each lamp is a layer that blinks fully on and off once a second; the second one is offset by half, so they take turns.',
  make(px){
    const P=4, HZ=1, DUTY=.5;
    const lit=(t,ph)=>{ let v=(t*HZ+ph)%1; if(v<0) v+=1; return v<DUTY; };
    const AX=55, AY=58, ROT=-4*TAU/360, SC=1.1, LR=13.4, LAMPS=[[-24,.4],[24,-.3]];
    const into=c=>{ c.translate(AX,AY); c.rotate(ROT); c.scale(SC,SC); };
    /* a scissor-cut disc: straight facets, radius a touch untrue */
    const disc=(c,x,y,r,sd)=>{ const n=24; c.beginPath(); for(let i=0;i<n;i++){ const a=(i+.5*sd)/n*TAU, rr=r*(1+.016*Math.sin(i*2.7+sd*3.1)); const X=x+Math.cos(a)*rr, Y=y+Math.sin(a)*rr; i?c.lineTo(X,Y):c.moveTo(X,Y); } c.closePath(); };
    const [S,s]=canvasOf(px);
    s.fillStyle=INK; s.fillRect(0,0,100,100);
    s.save(); into(s);
    s.fillStyle='#474b52'; poly(s,[-2.5,-52, 2.4,-52, 2.9,92, -3.1,92]); s.fill();                 /* the post */
    for(const a of [34,-34]){ s.save(); s.translate(.6,-47); s.rotate(a*TAU/360); s.fillStyle=BONE; poly(s,[-48,-5.2, 47.4,-5.6, 47.9,5.1, -47.6,5.5]); s.fill(); s.restore(); }   /* crossbuck */
    s.fillStyle=BONE; poly(s,[-40.6,-25.3, 40.2,-26.1, 51.2,-14.6, 51.6,14.9, 40.9,25.6, -40.1,26.2, -51.4,15.2, -51.1,-14.3]); s.fill();   /* the board's white border */
    s.fillStyle=COAL; poly(s,[-38.9,-22.6, 38.6,-23.3, 48.3,-13.3, 48.7,13.6, 39.2,22.8, -38.5,23.4, -48.5,13.8, -48.2,-13.1]); s.fill();
    LAMPS.forEach((L,i)=>{ s.fillStyle='#3a1813'; disc(s,L[0],L[1],LR,i); s.fill(); });                /* unlit lenses: on the board, not the lamp layers */
    s.restore();
    return (c,t)=>{
      const u=mod(t,P); raw(c); c.drawImage(S,0,0);
      reset(c,px); into(c); c.fillStyle=VERM;
      if(lit(u,0)){ disc(c,LAMPS[0][0],LAMPS[0][1],LR,0); c.fill(); }
      if(lit(u,.5)){ disc(c,LAMPS[1][0],LAMPS[1][1],LR,1); c.fill(); }
      reset(c,px);
    };
  } },

/* BLOCK FADE. Broadcast bench: an airliner on its stand, straight down from the news helicopter (paintApron above), made here as a
   1080 x 864 layer over nothing. PIXEL_FX.blockdissolve exactly: Order Random, Pattern 0, the kernel's own roll per block,
   (bx*73856093 ^ by*19349663), folded and multiplied as it does, and a block goes when its roll is under Amount. Block Size 54 px (a
   normal setting; the default 16 is under a pixel at menu size), so 20 blocks across. Amount is keyframed 0 -> 1, held, and back;
   stepped at 25 fps. */
{ id:'blockdissolve', name:'Block Fade', section:'Opacity / Visibility', isNew:true, still:.8,
  line:'The layer drops out in square blocks, in a random order, until nothing is left; bring Amount back and they return.',
  layer(px){ return paintApron(px); },   /* the layer alone, so the app's own renderer can be run on exactly this picture */
  make(px){
    const P=4.4, BW=5, NX=20, NY=16, LH=80;
    const PIC=paintApron(px);
    /* each block's roll, as the kernel computes it (Pattern 0, Order Random) */
    const ROLL=new Float32Array(NX*NY);
    for(let by=0;by<NY;by++) for(let bx=0;bx<NX;bx++){ let h=(bx*73856093)^(by*19349663); h=h^(h>>>13); h=(h*1274126177)>>>0; ROLL[by*NX+bx]=(h>>>0)/4294967295; }
    const amount=u=>{ const f=Math.floor(u*25)/25; return f<.6?0 : f<2.0?(f-.6)/1.4 : f<2.12?1 : f<3.4?1-(f-2.12)/1.28 : 0; };
    return (c,t)=>{
      const u=mod(t,P), a=amount(u), fr=Math.floor(u*25);
      reset(c,px); c.fillStyle='#000'; c.fillRect(0,0,100,100);
      c.drawImage(PIC,0,0,100,LH);
      c.fillStyle='#000';
      for(let by=0;by<NY;by++){ let run=-1; for(let bx=0;bx<=NX;bx++){ const gone=bx<NX&&ROLL[by*NX+bx]<a; if(gone&&run<0) run=bx; else if(!gone&&run>=0){ c.fillRect(run*BW,by*BW,(bx-run)*BW,BW); run=-1; } } }
      const tc=41*1500+7*25+fr;
      c.font=MONO(7); c.fillStyle=TEXT; c.textAlign='left'; c.textBaseline='middle';
      c.fillText('00:'+p2(Math.floor(tc/1500)%60)+':'+p2(Math.floor(tc/25)%60)+':'+p2(tc%25),4,90.5);
      c.font=MONO(4.2); c.fillStyle=DIM; c.textAlign='right'; c.fillText('AMOUNT',96,86.4);
      c.font=MONO(7); c.fillStyle=TEXT; c.fillText(a.toFixed(2),96,93);
      c.textAlign='left';
    };
  } },

/* COLOUR FLASH. Two-ink print, green and sunflower on bone: a keyboard printed in the green, its own layer over the paper. b966CfEnv
   and PIXEL_FX.colorflash: Mode Pulse, Rate 2 (120 a minute) on the clip's clock, Flash length 25 %, Curve Decay ((1 - r)^2), Strength
   .8, Blend Normal, Flash colour the second ink. Every key pixel goes p + (c - p) x a; the paper, which is not the layer, never moves. */
{ id:'colorflash', name:'Colour Flash', section:'Opacity / Visibility', isNew:true, still:.01,
  line:'On every beat the layer jumps to the flash colour and fades back; everything around the layer stays as it was.',
  make(px){
    const P=4, RATE=2, LEN=.25, STR=.8, GREEN='#1f7f70', SUN='#f6c544', PAPER='#e7e2d5';
    const R=rng(7);
    /* paper: bone with the odd fleck of green, the scum a riso drum leaves */
    const [PA,pa]=canvasOf(px); pa.fillStyle=PAPER; pa.fillRect(0,0,100,100);
    pa.fillStyle='rgba(31,127,112,.5)'; for(let i=0;i<260;i++){ pa.fillRect(R()*100,R()*100,.18+R()*.25,.18+R()*.25); }
    /* the keyboard layer */
    const WK=8.4, LK=44, BWD=4.9, LB=27.5, X0=-74, N=18, START=2, BOFF=[-.12,.12,0,-.15,0,.15,0];
    const [K,k]=canvasOf(px);
    k.save(); k.translate(50,52); k.rotate(-25*TAU/360);
    k.fillStyle='#f4f0e6'; k.fillRect(X0,0,N*WK,LK);
    k.fillStyle=GREEN; k.fillRect(X0-2,-11.5,N*WK+4,11.5);                                   /* fallboard */
    for(let i=0;i<=N;i++){ k.fillRect(X0+i*WK-.3,0,.6,LK); }                              /* gaps between the white keys */
    k.fillRect(X0,LK-1.3,N*WK,1.3);                                                        /* the key fronts */
    for(let i=0;i<N;i++){ const n=(START+i)%7; if(n===2||n===6) continue; const cx=X0+(i+1)*WK+BOFF[n]*BWD; k.fillRect(cx-BWD/2,0,BWD,LB); }
    k.restore();
    /* riso grain: the green never lies quite solid */
    { const G=Math.round(px), [NC,nc]=sheet(G), im=nc.createImageData(G,G), d=im.data; for(let i=0;i<G*G;i++){ if(R()<.09){ d[i*4+3]=255; } } nc.putImageData(im,0,0);
      k.save(); k.setTransform(1,0,0,1,0,0); k.globalCompositeOperation='destination-out'; k.globalAlpha=.32; k.drawImage(NC,0,0); k.restore(); }
    const [FL,fl]=sheet(px); fl.drawImage(K,0,0); fl.globalCompositeOperation='source-in'; fl.fillStyle=SUN; fl.fillRect(0,0,px,px);
    const env=u=>{ const x=u*RATE+1e-9, r=(x-Math.floor(x))/LEN; return r>=0&&r<1?(1-r)*(1-r):0; };
    return (c,t)=>{
      const u=mod(t,P), a=STR*env(u);
      raw(c); c.drawImage(PA,0,0); c.drawImage(K,0,0);
      if(a>.003){ c.globalAlpha=a; c.drawImage(FL,0,0); c.globalAlpha=1; }
      reset(c,px); c.font=MONO(4.6); c.fillStyle=GREEN; c.textAlign='left'; c.textBaseline='alphabetic'; c.fillText('120 BPM',6,10);
    };
  } },

/* FLASH (DARKEN). A made still: a launderette at night, three front loaders straight on, drawn here (paintLaundry above). flashdark's
   Build-up rhythm: Depth .6, Speed 10, Softness .3, Hold dark 0, on a 3.4 s clip, so the hits climb from 2.5 a second to 10 (the
   integral the kernel uses, S x E / ln 4 x (4^(t/E - 1) - 1/4)) and each hit is the kernel's own shape, dark for the first half of its
   window and softened by .3. Every pixel's colour is multiplied by 1 - Depth x hit; its alpha is never touched. Before and after the
   clip, the plain shot. */
{ id:'flashdark', name:'Flash (darken)', section:'Opacity / Visibility', isNew:true, still:2.16,
  line:'The picture dips darker in quick hits, never turning see-through; here the Build-up rhythm speeds the hits up into the drop.',
  layer(px){ return paintLaundry(px); },   /* the picture alone, for the app's own renderer */
  make(px){
    const P=4.3, T0=.45, CLIP=3.4, DEPTH=.6, SPEED=10, SOFT=.3, L4=Math.log(4);
    const S=paintLaundry(px);
    const phase=tl=>SPEED*CLIP/L4*(Math.pow(4,Math.min(tl,CLIP)/CLIP-1)-.25);
    const hit=w=>{ const hard=w<.5-1e-9?1:0; return hard+((.5+.5*Math.cos(Math.PI*w))-hard)*SOFT; };
    return (c,t)=>{
      const u=mod(t,P), tl=u-T0;
      raw(c); c.drawImage(S,0,0);
      if(tl>=0&&tl<CLIP){ const x=phase(tl)+1e-9, w=x-Math.floor(x), k=1-DEPTH*hit(w>0?w:0);
        if(k<.9999){ c.globalAlpha=1-k; c.fillStyle='#000'; c.fillRect(0,0,px,px); c.globalAlpha=1; } }
      reset(c,px); tab(c,4,90,'BUILD-UP',4.2,INK,BONE);
    };
  } },

/* BREATHE. Viewer overlay: a surfboard cut out on its own layer, over the viewer's transparency check, with its selection box.
   pulseopacity, Wave Sine, Speed .5 Hz, Depth .7: opacity = 1 - .7 x (.5 - .5 cos(2 pi x .5 x t)), so the layer goes from all there
   to 30 % and back every two seconds. The strip under the viewer plots that same curve over the loop; the playhead is now. */
{ id:'pulseopacity', name:'Breathe', section:'Opacity / Visibility', isNew:true, still:.7,
  line:'The layer\'s opacity sinks and rises smoothly, over and over, so what is under it shows through and hides again.',
  make(px){
    const P=4, SPD=.5, DEPTH=.7;
    const op=u=>{ const k=1-DEPTH*(.5-.5*Math.cos(TAU*SPD*u)); return clamp(k); };
    const VX0=4, VY0=4, VX1=96, VY1=70, GX0=14, GX1=96, GY0=77, GY1=95;
    const yOf=k=>lerp(GY1,GY0,k);
    /* the static viewer: check, frame, graph rules and the curve */
    const [U,ux]=canvasOf(px);
    ux.fillStyle=NAVY; ux.fillRect(0,0,100,100);
    ux.save(); ux.beginPath(); ux.rect(VX0,VY0,VX1-VX0,VY1-VY0); ux.clip();
    const CS=5.75; for(let j=0;j*CS<VY1-VY0;j++) for(let i=0;i*CS<VX1-VX0;i++){ ux.fillStyle=((i+j)&1)?'#323a49':'#262c38'; ux.fillRect(VX0+i*CS,VY0+j*CS,CS+.02,CS+.02); }
    ux.restore();
    ux.strokeStyle=HAIR; ux.lineWidth=.5; ux.strokeRect(VX0,VY0,VX1-VX0,VY1-VY0);
    ux.strokeStyle=HAIR; ux.beginPath(); for(const k of [1,.3]){ ux.moveTo(GX0,yOf(k)); ux.lineTo(GX1,yOf(k)); } ux.stroke();
    ux.font=MONO(3.6); ux.fillStyle=DIM; ux.textAlign='right'; ux.textBaseline='middle'; ux.fillText('100',GX0-1.5,yOf(1)); ux.fillText('30',GX0-1.5,yOf(.3));
    ux.strokeStyle=DIM; ux.lineWidth=.8; ux.beginPath(); for(let i=0;i<=160;i++){ const uu=i/160*P, x=lerp(GX0,GX1,i/160), y=yOf(op(uu)); i?ux.lineTo(x,y):ux.moveTo(x,y); } ux.stroke();
    /* the board, its own layer */
    const BX=49, BY=37.5, ANG=-27*TAU/360, BL=78, BWD=19.5;
    const hw=s0=>{ const q=(s0+.08)/1.08; return .5*BWD*Math.pow(Math.max(0,1-q*q),.55); };
    const outline=inset=>{ const pts=[]; for(let i=0;i<=60;i++){ const s0=lerp(-.965,1,i/60); pts.push([s0*BL/2, Math.max(0,hw(s0)-inset)]); } for(let i=60;i>=0;i--){ const s0=lerp(-.965,1,i/60); pts.push([s0*BL/2, -Math.max(0,hw(s0)-inset)]); } return pts; };
    const [B,b]=canvasOf(px);
    b.translate(BX,BY); b.rotate(ANG);
    b.fillStyle='#ece5d2'; quad(b,outline(0)); b.fill();
    b.fillStyle=VERM; quad(b,outline(.9)); b.fill(); b.fillStyle='#ece5d2'; quad(b,outline(2.1)); b.fill();   /* the pinline */
    b.fillStyle=INK; b.fillRect(-BL/2*.965,-.22,BL*.98,.44);                                                       /* stringer */
    b.save(); quad(b,outline(2.1)); b.clip(); b.fillStyle='#1d1e23'; b.fillRect(-BL/2,-BWD/2,BL*.19,BWD);           /* tail pad */
    b.fillStyle='#34363d'; for(let i=0;i<5;i++){ b.fillRect(-BL/2+2.2+i*2.6,-BWD/2,.6,BWD); } b.restore();
    /* selection box: the layer's own box, turned with it */
    const corners=[[-BL/2,-BWD/2],[BL/2,-BWD/2],[BL/2,BWD/2],[-BL/2,BWD/2]].map(q=>[BX+q[0]*Math.cos(ANG)-q[1]*Math.sin(ANG),BY+q[0]*Math.sin(ANG)+q[1]*Math.cos(ANG)]);
    const [O,o]=canvasOf(px);
    o.strokeStyle=DIM; o.lineWidth=.5; quad(o,corners); o.stroke();
    o.fillStyle=TEAL; for(const q of corners) o.fillRect(q[0]-1.2,q[1]-1.2,2.4,2.4);
    return (c,t)=>{
      const u=mod(t,P), k=op(u);
      raw(c); c.drawImage(U,0,0);
      c.globalAlpha=k; c.drawImage(B,0,0); c.globalAlpha=1; c.drawImage(O,0,0);
      reset(c,px);
      const x=lerp(GX0,GX1,u/P), y=yOf(k);
      c.fillStyle=TEAL; c.fillRect(x-.25,GY0-2.5,.5,GY1-GY0+4); c.fillRect(x-1.2,y-1.2,2.4,2.4);
      tab(c,VX0+1.6,VY0+1.6,'OPACITY '+String(Math.round(k*100)).padStart(3,'0')+'%',3.8,NAVY,TEXT);
    };
  } }

);
})();
