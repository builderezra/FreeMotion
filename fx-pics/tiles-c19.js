/* FreeMotion effect pictures, artist 19 (c19): seven Generative tiles. No photographs: every subject is made here.
   Each tile runs the effect's own maths (js/compositor.js) at a normal setting on that subject; see each note. */
(function(){ 'use strict';
const {TAU,clamp,lerp,seg,E,rng,hash,vnoise,canvasOf,photo,photoCover}=window.FXK;

const INK='#16130f', COAL='#0c0c0d', BONE='#e7e2d5', VERM='#e4471d', KEY='#ffce4a', NAVY='#161c28', HAIR='#2b3547', TXT='#eef2f8', DIM='#8b96a8', PAPER='#d9d4c6';
const MONO='"Courier Prime","Courier New",Courier,monospace';
const mod=(t,P)=>((t%P)+P)%P;
const begin=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; c.imageSmoothingEnabled=true; c.imageSmoothingQuality='high'; };
function blank(W,H){ const C=document.createElement('canvas'); C.width=W; C.height=H||W; return [C,C.getContext('2d')]; }
function tab(c,x,y,txt,bg,fg,size){ size=size||4.6; c.font='700 '+size+'px '+MONO; const w=c.measureText(txt).width+size*.9, h=size*1.45; c.fillStyle=bg; c.fillRect(x,y,w,h); c.fillStyle=fg; c.textBaseline='middle'; c.textAlign='left'; c.fillText(txt,x+size*.45,y+h*.54); c.textBaseline='alphabetic'; return w; }
const poly=(p,pts)=>{ pts.forEach((q,i)=>i?p.lineTo(q[0],q[1]):p.moveTo(q[0],q[1])); p.closePath(); };
function rrect(p,x,y,w,h,r){ r=Math.min(r,w/2,h/2); p.moveTo(x+r,y); p.lineTo(x+w-r,y); p.arcTo(x+w,y,x+w,y+r,r); p.lineTo(x+w,y+h-r); p.arcTo(x+w,y+h,x+w-r,y+h,r); p.lineTo(x+r,y+h); p.arcTo(x,y+h,x,y+h-r,r); p.lineTo(x,y+r); p.arcTo(x,y,x+r,y,r); p.closePath(); }
const pack=(r,g,b)=>((255<<24)|(clamp(Math.round(b),0,255)<<16)|(clamp(Math.round(g),0,255)<<8)|clamp(Math.round(r),0,255))>>>0;
/* a small 2D value noise of our own, for the subjects (not an effect) */
function h2(ix,iy,s){ let h=Math.imul(ix,374761393)^Math.imul(iy,668265263)^Math.imul(s+1,1274126177); h=Math.imul(h^(h>>>13),1274126177); return ((h^(h>>>16))>>>0)/4294967295; }
function vn2(x,y,s){ const ix=Math.floor(x), iy=Math.floor(y); let fx=x-ix, fy=y-iy; fx=fx*fx*(3-2*fx); fy=fy*fy*(3-2*fy); const a=h2(ix,iy,s), b=h2(ix+1,iy,s), c=h2(ix,iy+1,s), e=h2(ix+1,iy+1,s); return (a+(b-a)*fx)*(1-fy)+(c+(e-c)*fx)*fy; }
function fbm(x,y,s,n){ let v=0, w=.5, tw=0; for(let o=0;o<n;o++){ v+=w*vn2(x,y,s+o*31); tw+=w; x*=2.03; y*=2.03; w*=.5; } return v/tw; }

window.FX_TILES.push(

/* CHECKER. G, cut paper. PIXEL_FX.checker on a plain Bone backdrop layer of a 1080 frame: Cell size 108 (ten across), Colour
   vermilion, Strength .5, so every other square is the two mixed half and half and the top-left square is left alone, as the
   kernel leaves it: the bare backdrop turns into a board. Strength comes on in three steps, then Scroll across (keyframed, so
   its distance is integrated) carries the board exactly two squares, which is the same board again. The shoe is its own layer
   above, so the effect never touches it. (Redrawn by checker 3: the chess knight on a board repeated Shadow Bloom's knight on a
   chequered floor; a wine glass was tried and dropped, as it made a pair with the Dots tile's mug.) */
{ id:'checker', name:'Checker', section:'Generative', isNew:true, still:1.2,
  line:'Every other square of a board is tinted with your colour, over the whole layer, and Scroll slides the board along.',
  make(px){
    const P=4.4, CELL=10, MIX=.5, VR=[228,71,29];
    /* a stiletto pump in profile, scissor cut, toe to the left, a few degrees off true */
    const SHOE=new Path2D();
    SHOE.moveTo(10,72); SHOE.bezierCurveTo(11.5,66.2,22,62.6,33,62.2);           /* toe and vamp */
    SHOE.bezierCurveTo(37.5,62.1,40,63.2,43.5,63);                                /* the throat, cut low */
    SHOE.bezierCurveTo(55,61.8,67,57.6,77.2,50.2);                                /* topline up to the back */
    SHOE.lineTo(79.8,50.8); SHOE.bezierCurveTo(81.4,54.2,81,57.8,78.8,60.6);      /* the heel counter */
    SHOE.lineTo(77.4,61.8); SHOE.lineTo(75.8,89.6); SHOE.lineTo(72.8,89.6); SHOE.lineTo(72.6,63.8);   /* the stiletto */
    SHOE.bezierCurveTo(63,65.8,55,73.9,44,78.5);                                  /* the arch */
    SHOE.bezierCurveTo(33,82.3,18,80.7,10,72); SHOE.closePath();
    /* the lining, seen inside the topline */
    const LINING=new Path2D(); poly(LINING,[[42.8,63.3],[55.4,61.9],[67.4,58.2],[76.9,51.8],[78.4,52.6],[69,59.8],[56,64.1],[44.4,65.1]]);
    const strength=m=>{ if(m<.5||m>=4.25) return 0; if(m<.875) return MIX*Math.min(3,Math.floor((m-.5)/.125)+1)/3; if(m<3.875) return MIX; return MIX*Math.max(0,3-Math.floor((m-3.875)/.125)-1)/3; };
    const scroll=m=>2*CELL*E.inOut(seg(m,1.55,3.05));
    return (c,t)=>{ begin(c,px); const m=mod(t,P), k=strength(m);
      /* the backdrop layer and its effect: Bone, every other square mixed toward the colour by Strength */
      c.fillStyle=BONE; c.fillRect(0,0,100,100);
      if(k>0){ const ox=scroll(m), i0=Math.floor(-ox/CELL)-1;
        c.fillStyle='rgba('+VR.join(',')+','+k.toFixed(3)+')'; c.beginPath();
        for(let j=0;j<10;j++) for(let i=i0;i<i0+13;i++){ if(((i+j)&1)===0) continue; const x=ox+i*CELL; if(x>=100||x+CELL<=0) continue; c.rect(x,j*CELL,CELL,CELL); }
        c.fill(); }
      /* the shoe layer, untouched: ink, the lining in vermilion, one bone highlight along the toe from the light up on the left */
      c.save(); c.translate(46,80); c.rotate(-3*Math.PI/180); c.translate(-46,-80);
      c.fillStyle=INK; c.fill(SHOE);
      c.fillStyle=VERM; c.fill(LINING);
      c.strokeStyle=BONE; c.lineWidth=1.05; c.lineCap='butt'; c.beginPath(); c.moveTo(14.4,67.2); c.quadraticCurveTo(19.6,64.2,28,63.6); c.stroke();
      c.restore();
    };
  } },

/* CLOUDS. A made still: the sky through an airliner window. PIXEL_FX.clouds runs on the sky layer only (a flat blue, 1080 frame):
   Cloud white, Amount .6, Scale 300 % (lattice squares of 192, 96 and 48 px at the kernel's own .5715/.2857/.1428 weights and its
   integer hash), Contrast 140 %, Drift 120 px/s, so the cover slides left. Where the noise is low the mix pulls toward black, which
   is why the cover has grey undersides: that is the kernel, not shading. The cabin wall and blind are another layer. */
{ id:'clouds', name:'Clouds', section:'Generative', isNew:true, still:2.6,
  line:'Grey-white cloud cover is mixed over the layer; Drift slides it across, here behind a plane window.',
  make(px){
    const P=4.8, AMT=.6, SC=3, CT=1.4, DRIFT=120, SKY='#6f9fd6';
    const Rw=Math.max(80,Math.round(px*.5)), TW=Math.ceil(Rw*1.6), TH=Rw;
    const cells=[64*SC,32*SC,16*SC], wts=[.5715,.2857,.1428];
    const clh=(cx,cy)=>{ let h=(cx*374761393+cy*668265263)|0; h=(h^(h>>>13))*1274126177|0; h=h^(h>>>16); return ((h>>>0)%1000)/999; };
    const sm=f=>f*f*(3-2*f);
    const [TX,tx]=blank(TW,TH), im=tx.createImageData(TW,TH), d=im.data;
    for(let j=0;j<TH;j++){ const Y=(j+.5)/Rw*1080;
      for(let i=0;i<TW;i++){ const X=(i+.5)/Rw*1080; let s=0;
        for(let o=0;o<3;o++){ const C=cells[o], gx=Math.floor(X/C), gy=Math.floor(Y/C), fx=sm(X/C-gx), fy=sm(Y/C-gy);
          const a=clh(gx,gy), b=clh(gx+1,gy), e=clh(gx,gy+1), f=clh(gx+1,gy+1), top=a+(b-a)*fx, bot=e+(f-e)*fx; s+=(top+(bot-top)*fy)*wts[o]; }
        let g=s*255; g=127.5+(g-127.5)*CT; g=g<0?0:(g>255?255:g); const k=(j*TW+i)*4; d[k]=d[k+1]=d[k+2]=g; d[k+3]=255; } }
    tx.putImageData(im,0,0);
    /* the window layer: wall, bezel, the tunnel's shadowed side, the opening cut out */
    const OX=36.5, OY=14, OW=41, OH=67, OR=19.5, OPEN=new Path2D(); rrect(OPEN,OX,OY,OW,OH,OR);
    const [WL,wl]=blank(px); wl.setTransform(px/100,0,0,px/100,0,0);
    let g=wl.createLinearGradient(8,0,92,100); g.addColorStop(0,'#e6e2da'); g.addColorStop(1,'#b9b3a8'); wl.fillStyle=g; wl.fillRect(0,0,100,100);
    const BZ=new Path2D(); rrect(BZ,28.5,5.5,57,85,27);
    wl.fillStyle='rgba(60,52,40,.16)'; wl.save(); wl.translate(1.1,1.5); wl.fill(BZ); wl.restore();
    g=wl.createLinearGradient(28,5,86,90); g.addColorStop(0,'#ece8e0'); g.addColorStop(1,'#c6c0b5'); wl.fillStyle=g; wl.fill(BZ);
    const TUN=new Path2D(); rrect(TUN,OX-2.4,OY-2.6,OW+3.4,OH+3.6,OR+2.2); wl.fillStyle='#9d968a'; wl.fill(TUN);
    const LIT=new Path2D(); rrect(LIT,OX+.6,OY+.8,OW+.9,OH+1.1,OR+.4); wl.fillStyle='#d8d3c9'; wl.fill(LIT);
    wl.globalCompositeOperation='destination-out'; wl.fill(OPEN); wl.globalCompositeOperation='source-over';
    const BL=27.5;   /* the blind, pulled a little way down */
    return (c,t)=>{ begin(c,px); const m=mod(t,P), a=AMT*E.inOut(seg(m,.6,1.25))*(1-E.inOut(seg(m,3.85,4.45)));
      c.fillStyle=SKY; c.fillRect(30,8,56,80);
      if(a>.003){ c.globalAlpha=a; const sx=(DRIFT*m)/1080*Rw; c.drawImage(TX,sx,0,Rw,TH,0,0,100,100); c.globalAlpha=1; }
      c.fillStyle='rgba(255,255,255,.07)'; c.fill(OPEN);
      c.fillStyle='#ebe7df'; c.fillRect(OX-1,OY-1,OW+2,BL-OY+1); c.fillStyle='#cfc9be'; c.fillRect(OX-1,BL-1.3,OW+2,1.3);
      c.fillStyle='rgba(30,40,55,.55)'; c.beginPath(); c.arc(OX+OW/2,OY+OH-6.5,.75,0,TAU); c.fill();
      c.drawImage(WL,0,0,100,100);
    };
  } },

/* TOPO BANDS. A, a colourist's split, on a grey height map made here (bright = high), the input this effect was named for.
   PIXEL_FX.contourstrips: Strips 6, Strength 1, Weak strips .4, Low #1f7f70, High #f6c544: each tone falls in one of six strips,
   odd strips take their colour whole and even ones 40 % over the grey. Then Band offset is keyframed 0 to -.14 and back: every
   tone drops that far down the strips, so the lowest strip climbs the slopes like a rising sea and the top strip leaves the peak.
   The key on the right is the same effect on a 0 to 1 ramp. Matched pixel for pixel against the real render of this frame. */
{ id:'contourstrips', name:'Topo Bands', section:'Generative', isNew:true, still:1.8,
  line:'The picture\'s tones are sorted into a few strips tinted from Low to High; Band offset slides where they fall.',
  make(px){
    const P=5, L=6, ALT=.4, LO=[31,127,112], HI=[246,197,68], MW=89, OFF=-.14;
    const R=Math.max(90,Math.min(380,Math.round(px))), RW=Math.round(R*MW/100), n=RW*R;
    const G=(u,v,x,y,s)=>Math.exp(-((u-x)*(u-x)+(v-y)*(v-y))/(2*s*s));
    const G8=new Uint8Array(n), HF=new Float32Array(n); let hmax=0;
    const [SRC,sx]=blank(RW,R), si=sx.createImageData(RW,R), s32=new Uint32Array(si.data.buffer);
    for(let j=0;j<R;j++){ const v=(j+.5)/R*100; for(let i=0;i<RW;i++){ const u=(i+.5)/R*100;
      let h=.66*G(u,v,57,31,14)+.5*G(u,v,36,61,12)+.42*G(u,v,71,73,10.5)+.26*G(u,v,15,88,11)+.3*G(u,v,82,13,8.5)+.18*G(u,v,48,46,8);
      h+= .2*(fbm(u/17,v/17,5,4)-.5)*(.45+h); h=Math.max(0,h); HF[j*RW+i]=h; if(h>hmax) hmax=h; } }
    for(let k=0;k<n;k++){ const q=Math.round(clamp(.04+.93*HF[k]/hmax,0,1)*255); G8[k]=q; s32[k]=pack(q,q,q); }
    sx.putImageData(si,0,0);
    /* the kernel per grey level: band = floor((l + offset) * Strips), held in 0..Strips-1, then its colour and mix */
    const PAL=new Uint32Array(256);
    const palette=off=>{ for(let q=0;q<256;q++){ let b=Math.floor((q/255+off)*L); if(b<0) b=0; if(b>=L) b=L-1;
      const f=b/(L-1), mx=(b&1)?1:ALT; PAL[q]=pack(q+(LO[0]+(HI[0]-LO[0])*f-q)*mx,q+(LO[1]+(HI[1]-LO[1])*f-q)*mx,q+(LO[2]+(HI[2]-LO[2])*f-q)*mx); } };
    const [BND,bx]=blank(RW,R), bi=bx.createImageData(RW,R), b32=new Uint32Array(bi.data.buffer);
    const KH=Math.max(40,Math.round(R*.8)), KQ=new Uint8Array(KH); for(let j=0;j<KH;j++) KQ[j]=Math.round((1-(j+.5)/KH)*255);
    const [KEYC,kx]=blank(1,KH), ki=kx.createImageData(1,KH), k32=new Uint32Array(ki.data.buffer);
    const [KEYG,kg]=blank(1,KH), kgi=kg.createImageData(1,KH), kg32=new Uint32Array(kgi.data.buffer);
    for(let j=0;j<KH;j++) kg32[j]=pack(KQ[j],KQ[j],KQ[j]); kg.putImageData(kgi,0,0);
    let last=NaN;
    const paint=off=>{ if(off===last) return; last=off; palette(off);
      for(let i=0;i<n;i++) b32[i]=PAL[G8[i]]; bx.putImageData(bi,0,0);
      for(let j=0;j<KH;j++) k32[j]=PAL[KQ[j]]; kx.putImageData(ki,0,0); };
    const split=m=>m<.6?0:m<1.15?MW*E.inOut(seg(m,.6,1.15)):m<4.4?MW:MW*(1-E.inOut(seg(m,4.4,4.95)));
    const offset=m=>OFF*E.inOut(seg(m,1.7,2.5))*(1-E.inOut(seg(m,3.35,4.05)));
    return (c,t)=>{ begin(c,px); const m=mod(t,P), x=split(m), off=Math.round(offset(m)*400)/400;
      c.fillStyle=INK; c.fillRect(0,0,100,100);
      c.drawImage(SRC,0,0,MW,100);
      if(x>0){ paint(off); const w=Math.min(RW,Math.max(1,Math.round(x/MW*RW))); c.drawImage(BND,0,0,w,R,0,0,w/RW*MW,100); }
      if(x>0&&x<MW){ c.fillStyle=BONE; c.fillRect(x-.35,0,.7,100); }
      /* the key: a tone ramp, bright at the top, through the same strips */
      c.drawImage(x>=MW?KEYC:KEYG,0,0,1,KH,92.2,10,4.6,80);
      c.fillStyle=DIM; c.fillRect(91.6,10,.25,80); c.fillRect(91.6,10,1.2,.25); c.fillRect(91.6,89.75,1.2,.25);
      c.font='700 3.6px '+MONO; c.fillStyle=DIM; c.textAlign='center'; c.fillText('1',94.5,7.6); c.fillText('0',94.5,95); c.textAlign='left';
    };
  } },

/* DOTS. D, two-ink print (Ink and yellow on Bone). A wingback armchair cut out as its own layer over a printed backdrop (art
   director, ad: it was a mug, which made a pair with Heat Map's coffee cup). PIXEL_FX.dots on the chair layer only: Colour
   Bone, Strength .85, Spacing 86 px of a 1080 frame, hard edges; Dot size is keyframed .06 up to .32, Layout cuts from Grid to
   Staggered (every other row half a dot along, the kernel's dots966), then the dots shrink away. Every dot is the same size on
   every tone, which is what separates this from Halftone, and nothing lands on the backdrop. */
{ id:'dots', name:'Dots', section:'Generative', isNew:true, still:2.7,
  line:'Even rows of same-size dots in one colour, painted only where the layer is; Staggered offsets every other row.',
  make(px){
    const P=4.6, S=86/10.8, A=.85;
    /* the chair layer: one outline (back, wings, rolled arms, skirt) plus two front legs, every subpath wound the same way */
    const MUG=new Path2D(), OX=-5;
    MUG.moveTo(OX+32,22); MUG.quadraticCurveTo(OX+50,13.5,OX+68,22);
    MUG.bezierCurveTo(OX+74,24,OX+79,30,OX+78,44); MUG.bezierCurveTo(OX+83.5,44.5,OX+84.5,52.5,OX+80,55.5);
    MUG.lineTo(OX+79.6,80); MUG.lineTo(OX+20.4,80); MUG.lineTo(OX+20,55.5);
    MUG.bezierCurveTo(OX+15.5,52.5,OX+16.5,44.5,OX+22,44); MUG.bezierCurveTo(OX+21,30,OX+26,24,OX+32,22); MUG.closePath();
    MUG.moveTo(OX+23,79); MUG.lineTo(OX+28,79); MUG.lineTo(OX+27,88.5); MUG.lineTo(OX+24.2,88.5); MUG.closePath();
    MUG.moveTo(OX+72,79); MUG.lineTo(OX+77,79); MUG.lineTo(OX+75.8,88.5); MUG.lineTo(OX+73,88.5); MUG.closePath();
    /* the upholstery's seams, a lighter ink in the layer itself: arms against the seat, the cushion's front, the skirt */
    const SEAM=new Path2D();
    SEAM.moveTo(OX+33.5,50); SEAM.lineTo(OX+33.5,71.5); SEAM.moveTo(OX+66.5,50); SEAM.lineTo(OX+66.5,71.5);
    SEAM.moveTo(OX+33.5,61.5); SEAM.lineTo(OX+66.5,61.5); SEAM.moveTo(OX+20.6,71.5); SEAM.lineTo(OX+79.4,71.5);
    SEAM.moveTo(OX+22,44); SEAM.quadraticCurveTo(OX+28,46,OX+33.5,50); SEAM.moveTo(OX+78,44); SEAM.quadraticCurveTo(OX+72,46,OX+66.5,50);
    const size=m=>{ if(m<.5||m>=4.2) return 0; if(m<1.0) return .06+.26*Math.min(5,Math.floor((m-.5)/(1/12)))/5; if(m<3.7) return .32; return .32-.26*Math.min(5,Math.floor((m-3.7)/(1/12))+1)/5; };
    const R=rng(19), SPK=[]; for(let i=0;i<70;i++) SPK.push([R()*100,R()*100,.12+R()*.22]);
    return (c,t)=>{ begin(c,px); const m=mod(t,P), r=size(m)*S, stag=m>=2.2;
      /* the backdrop (its own layer): Bone paper, one yellow plate, paper speckle */
      c.fillStyle=BONE; c.fillRect(0,0,100,100);
      c.fillStyle=KEY; c.fillRect(44.7,-1,60,102);
      c.fillStyle='rgba(22,19,15,.18)'; for(const q of SPK){ c.fillRect(q[0],q[1],q[2],q[2]); }
      /* the mug layer and its dots */
      c.fillStyle=INK; c.fill(MUG);
      c.save(); c.clip(MUG); c.strokeStyle='#4a4238'; c.lineWidth=.9; c.lineCap='round'; c.stroke(SEAM); c.restore();
      if(r>0){ c.save(); c.clip(MUG); c.fillStyle='rgba(231,226,213,'+A+')'; c.beginPath();
        for(let j=0;j*S<100;j++){ const xo=stag&&(j&1)?-S/2:0, cy=j*S+S/2; for(let i=-1;i*S<101;i++){ const cx=i*S+S/2+xo; if(cx<6||cx>86||cy<10||cy>92) continue; c.moveTo(cx+r,cy); c.arc(cx,cy,r,0,TAU); } }
        c.fill(); c.restore(); }
    };
  } },

/* FRACTAL NOISE. F, viewer overlay. A rectangle layer selected in the viewer (hairline box, teal corner handles); under it, the
   effect's Pattern control. PIXEL_FX.fractalnoise as the whole layer: Scale 200 px of a 1080 frame, Octaves 4, Contrast 130 %,
   Dark Coal, Light Bone, Normal at 100 %, Evolution .5/s (each octave slides through the lattice at its own rate, so it churns),
   the kernel's own lattice hash, salts and smoothstep. Pattern is keyframed, so it cuts: Basic, then Turbulent (|2v - 1| on every
   octave: dark creases), then Ridged ((1 - |2v - 1|) squared: bright ridges). The lattice repeats every 111 units here so it can
   slide on; the frame is 100. */
{ id:'fractalnoise', name:'Fractal Noise', section:'Generative', isNew:true, still:4.1,
  line:'Fills the layer with layered noise that slowly churns; Pattern switches it between soft, creased and ridged.',
  make(px){
    const P=5, SCU=200/10.8, NO=4, EVO=.5, CT=1.3, LOW=[12,12,13], HIGH=[231,226,213], NP=6, T=SCU*NP;
    const BX=6, BY=6, BW=88, BH=71;
    const Rw=clamp(Math.round(px*.36),90,220), TS=Math.round(Rw*T/100), RX=Math.round(Rw*BW/100), RY=Math.round(Rw*BH/100);
    const fnHash=(ix,iy,salt)=>{ let h=Math.imul(ix,374761393)^Math.imul(iy,668265263)^Math.imul(salt,1274126177); h=Math.imul(h^(h>>>13),1274126177); return ((h^(h>>>16))>>>0)/4294967295; };
    const TB=[], WT=[]; let TOT=0;
    for(let o=0;o<NO;o++){ const N=NP<<o, cp=TS/N, a=new Float32Array(TS*TS), salt=o*1013; WT.push(Math.pow(.5,o)); TOT+=WT[o];
      for(let j=0;j<TS;j++){ const gy=(j+.5)/cp, iy=Math.floor(gy); let fy=gy-iy; fy=fy*fy*(3-2*fy); const y0=iy%N, y1=(iy+1)%N;
        for(let i=0;i<TS;i++){ const gx=(i+.5)/cp, ix=Math.floor(gx); let fx=gx-ix; fx=fx*fx*(3-2*fx); const x0=ix%N, x1=(ix+1)%N;
          const p=fnHash(x0,y0,salt), q=fnHash(x1,y0,salt), r=fnHash(x0,y1,salt), s=fnHash(x1,y1,salt);
          a[j*TS+i]=(p+(q-p)*fx)*(1-fy)+(r+(s-r)*fx)*fy; } }
      TB.push(a); }
    const LUT=new Uint32Array(1024); for(let i=0;i<1024;i++){ const v=i/1023; LUT[i]=pack(LOW[0]+(HIGH[0]-LOW[0])*v,LOW[1]+(HIGH[1]-LOW[1])*v,LOW[2]+(HIGH[2]-LOW[2])*v); }
    const [OUT,ox]=blank(RX,RY), oi=ox.createImageData(RX,RY), o32=new Uint32Array(oi.data.buffer);
    const OX=new Int32Array(NO), OY=new Int32Array(NO), SEGS=[['BASIC',0],['TURBULENT',1],['RIDGED',3]], SW=BW/3;
    const pat=m=>m<1.65?0:m<3.3?1:2;
    let lastKey=-1;   /* the field churns on twelves: each 1/12 s step is worked once and redrawn until the next */
    return (c,t)=>{ const m=mod(t,P), si=pat(m), pt=SEGS[si][1], fq=Math.floor(m*12), ph=EVO*fq/12, key=si*1000+fq;
      if(key!==lastKey){ lastKey=key;
      for(let o=0;o<NO;o++){ const cp=TS/(NP<<o); OX[o]=Math.round(mod(ph*(.7+o*.21)*cp,TS)); OY[o]=Math.round(mod(-ph*(.9+o*.17)*cp,TS)); }
      for(let y=0;y<RY;y++){ const ro=y*RX;
        for(let x=0;x<RX;x++){ let s=0;
          for(let o=0;o<NO;o++){ let yy=y+OY[o]; if(yy>=TS) yy-=TS; let xx=x+OX[o]; if(xx>=TS) xx-=TS; let v=TB[o][yy*TS+xx];
            if(pt===1) v=Math.abs(v*2-1); else if(pt===3){ v=1-Math.abs(v*2-1); v*=v; } s+=v*WT[o]; }
          let val=(s/TOT-.5)*CT+.5; val=val<0?0:(val>1?1:val); o32[ro+x]=LUT[(val*1023)|0]; } }
      ox.putImageData(oi,0,0); }
      begin(c,px); c.fillStyle=NAVY; c.fillRect(0,0,100,100);
      c.drawImage(OUT,BX,BY,BW,BH);
      c.strokeStyle=DIM; c.lineWidth=.5; c.strokeRect(BX,BY,BW,BH);
      c.fillStyle='#29d9bb'; for(const q of [[BX,BY],[BX+BW,BY],[BX,BY+BH],[BX+BW,BY+BH]]) c.fillRect(q[0]-1.3,q[1]-1.3,2.6,2.6);
      /* the Pattern control, its live segment lit */
      const Y=84, H=9.5; c.font='700 4.1px '+MONO; c.textAlign='center'; c.textBaseline='middle';
      SEGS.forEach((sg,k)=>{ const x=BX+k*SW; if(k===si){ c.fillStyle=TXT; c.fillRect(x,Y,SW,H); } else { c.strokeStyle=HAIR; c.lineWidth=.5; c.strokeRect(x+.25,Y+.25,SW-.5,H-.5); }
        c.fillStyle=k===si?NAVY:DIM; c.fillText(sg[0],x+SW/2,Y+H/2+.2); });
      c.textAlign='left'; c.textBaseline='alphabetic';
    };
  } },

/* ROCK NOISE. A made still: a boulder cut out as its own layer (flat dark grey) on a cool grey backdrop, a 720 px frame.
   PIXEL_FX.fractalridges on the boulder layer only (it is alpha-gated: nothing lands on the backdrop): three octaves of value noise,
   each folded to a ridge (1 - |2n - 1|) and summed at .5/.3/.2 with the kernel's own hash, Scale 110 px, Sharpness 3 (the sum cubed,
   which pinches the ridges thin), Colour Gradient from Low #120e0c to High #f0662a, Amount .9, Normal, Speed .6: each octave slides
   its own way through the lattice, so the cracks form and break where they are. Amount comes on in three steps. */
{ id:'fractalridges', name:'Rock Noise', section:'Generative', isNew:true, still:2.0,
  line:'A web of ridged noise, coloured from Low to High, is laid over the layer and slowly churns.',
  make(px){
    const P=4.6, SCU=110/7.2, N0=7, T=SCU*N0, SPD=.6, AMT=.9, SH=3, LOW=[18,14,12], HIGH=[240,102,42], BG=[42,38,34], WT=[.5,.3,.2], EX=[.9,-1.3,1.7], EY=[-1.4,.8,1.1];
    const Rw=clamp(Math.round(px*.45),90,270), TS=Math.round(Rw*T/100);
    const frh=(ix,iy)=>{ let h=(ix*374761393+iy*668265263)|0; h=(h^(h>>>13))*1274126177; h=(h^(h>>>16))>>>0; return h/4294967295; };
    const TB=[];
    for(let o=0;o<3;o++){ const N=N0<<o, cp=TS/N, a=new Float32Array(TS*TS);
      for(let j=0;j<TS;j++){ const gy=(j+.5)/cp, iy=Math.floor(gy); let fy=gy-iy; fy=fy*fy*(3-2*fy); const y0=iy%N, y1=(iy+1)%N;
        for(let i=0;i<TS;i++){ const gx=(i+.5)/cp, ix=Math.floor(gx); let fx=gx-ix; fx=fx*fx*(3-2*fx); const x0=ix%N, x1=(ix+1)%N;
          const p=frh(x0,y0), q=frh(x1,y0), r=frh(x0,y1), s=frh(x1,y1), top=p+(q-p)*fx, bot=r+(s-r)*fx, nn=top+(bot-top)*fy;
          a[j*TS+i]=(1-Math.abs(2*nn-1))*WT[o]; } }
      TB.push(a); }
    const LUT=new Uint32Array(1024); for(let i=0;i<1024;i++){ const v=Math.pow(i/1023,SH), cr=LOW[0]+(HIGH[0]-LOW[0])*v, cg=LOW[1]+(HIGH[1]-LOW[1])*v, cb=LOW[2]+(HIGH[2]-LOW[2])*v;
      LUT[i]=pack(BG[0]+(cr-BG[0])*AMT,BG[1]+(cg-BG[1])*AMT,BG[2]+(cb-BG[2])*AMT); }
    const [OUT,ox]=blank(Rw,Rw), oi=ox.createImageData(Rw,Rw), o32=new Uint32Array(oi.data.buffer), OX=new Int32Array(3), OY=new Int32Array(3);
    const ROCK=new Path2D(); poly(ROCK,[[19,101],[20.5,80],[26.5,62.5],[37.5,46],[52,35.5],[66.5,29],[81,27.5],[93.5,32],[101,40],[101,101]]);
    const amount=m=>{ if(m<.45||m>=4.15) return 0; if(m<.825) return Math.min(3,Math.floor((m-.45)/.125)+1)/3; return 1; };
    return (c,t)=>{ const m=mod(t,P), a=amount(m), ph=SPD*m;
      begin(c,px); c.fillStyle='#c3c7cd'; c.fillRect(0,0,100,100);
      c.fillStyle='rgb('+BG.join(',')+')'; c.fill(ROCK);
      if(a<=0) return;
      for(let o=0;o<3;o++){ const cp=TS/(N0<<o); OX[o]=Math.round(mod(EX[o]*ph*cp,TS)); OY[o]=Math.round(mod(EY[o]*ph*cp,TS)); }
      const A=TB[0], B=TB[1], C2=TB[2];
      for(let y=0;y<Rw;y++){ let y0=y+OY[0]; if(y0>=TS) y0-=TS; let y1=y+OY[1]; if(y1>=TS) y1-=TS; let y2=y+OY[2]; if(y2>=TS) y2-=TS; y0*=TS; y1*=TS; y2*=TS; const ro=y*Rw;
        for(let x=0;x<Rw;x++){ let x0=x+OX[0]; if(x0>=TS) x0-=TS; let x1=x+OX[1]; if(x1>=TS) x1-=TS; let x2=x+OX[2]; if(x2>=TS) x2-=TS;
          const s=A[y0+x0]+B[y1+x1]+C2[y2+x2]; o32[ro+x]=LUT[(s>1?1023:(s*1023)|0)]; } }
      ox.putImageData(oi,0,0);
      c.save(); c.clip(ROCK); c.globalAlpha=a; c.drawImage(OUT,0,0,100,100); c.restore(); c.globalAlpha=1;
    };
  } },

/* GRID. A made still: a glazed wall with window light on it (the layer, made here). PIXEL_FX.grid over it: Colour Bone, Spacing
   120 px of a 1080 frame, Line weight 8 % (10 px), Strength 1, so the lines are grout and the wall reads as tiles. Then Angle is
   keyframed 0 to 45: the kernel turns the lattice about the layer's top-left corner, which is why it sweeps from there. */
{ id:'grid', name:'Grid', section:'Generative', isNew:true, still:1.3,
  line:'Even lines in a grid are drawn over the layer, like grout on a wall; Angle turns the whole grid.',
  make(px){
    const P=4.6, S=120/10.8, LW=10/10.8;
    const Wl=Math.max(16,Math.round(px*.07)), [LIT,lx]=blank(Wl); lx.setTransform(Wl/100,0,0,Wl/100,0,0);
    lx.fillStyle='rgba(255,255,255,1)'; lx.beginPath(); lx.moveTo(30,-5); lx.lineTo(72,-5); lx.lineTo(108,62); lx.lineTo(62,74); lx.closePath(); lx.fill();
    const [WALL,wx]=blank(px); wx.setTransform(px/100,0,0,px/100,0,0);
    let g=wx.createLinearGradient(0,0,100,100); g.addColorStop(0,'#2b4f8f'); g.addColorStop(1,'#16294f'); wx.fillStyle=g; wx.fillRect(0,0,100,100);
    wx.globalAlpha=.32; wx.globalCompositeOperation='lighter'; wx.drawImage(LIT,0,0,100,100); wx.globalAlpha=1; wx.globalCompositeOperation='source-over';
    const ang=m=>45*E.inOut(seg(m,1.75,2.85))*(m<3.95?1:0);
    return (c,t)=>{ begin(c,px); const m=mod(t,P);
      c.drawImage(WALL,0,0,100,100);
      if(m<.6||m>=3.95) return;
      const a=ang(m)*Math.PI/180, cs=Math.cos(a), sn=Math.sin(a);
      const us=[0,100*cs,100*sn,100*cs+100*sn], vs=[0,-100*sn,100*cs,-100*sn+100*cs];
      const u0=Math.min(...us), u1=Math.max(...us), v0=Math.min(...vs), v1=Math.max(...vs);
      c.save(); c.rotate(a); c.fillStyle=BONE; c.beginPath();
      for(let k=Math.floor(u0/S);k*S<=u1;k++) c.rect(k*S,v0,LW,v1-v0);
      for(let k=Math.floor(v0/S);k*S<=v1;k++) c.rect(u0,k*S,u1-u0,LW);
      c.fill(); c.restore();
    };
  } }

);
})();
