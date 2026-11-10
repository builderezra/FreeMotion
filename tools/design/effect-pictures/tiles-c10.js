/* FreeMotion effect pictures, artist 10 (c10): Temporal Denoise, Unsharp Mask, Burst Streaks, Cartoon, Compression Crunch,
   Backdrop Clone, Dither. No photographs: every subject is drawn here, and every change on it is the effect's own arithmetic
   from js/compositor.js, run once in make() on that subject. Directions (ART.md): A, F, G, A, H, B, D.
   Subjects: a night loading-bay shutter with a passer-by, a watch dial at 400 %, an extractor fan against daylight, an electric guitar,
   concert footage in a follow spot, a container stack, a gibbous moon. The ports of Burst Streaks, Unsharp Mask, Cartoon,
   Compression Crunch and Dither (Ordered, Atkinson) were run beside the app's own render on the same photograph: identical bytes. */
(function(){ 'use strict';
const {TAU,clamp,lerp,seg,E,rng}=window.FXK;

const BONE='#e7e2d5', INK='#16130f', COAL='#0c0c0d', NAVY='#161c28', HAIR='#2b3547', TEXT='#eef2f8', DIM='#8b96a8', VERM='#e4471d', YEL='#ffce4a', TEAL='#29d9bb';
const MONO=s=>'bold '+s+'px "Courier Prime","Courier New",monospace';
const SANS=s=>'800 '+s+'px "Helvetica Neue",Helvetica,Arial,"Segoe UI",system-ui,sans-serif';
const mod=(t,P)=>((t%P)+P)%P;
const reset=(c,px)=>{ c.setTransform(px/100,0,0,px/100,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; c.imageSmoothingEnabled=true; };
const sheet=(w,h)=>{ const C=document.createElement('canvas'); C.width=w; C.height=h===undefined?w:h; return [C,C.getContext('2d')]; };
/* a canvas that is drawn once and read once: kept in memory, where the one getImageData costs a tenth of a GPU read-back */
const sheetR=(w,h)=>{ const C=document.createElement('canvas'); C.width=w; C.height=h===undefined?w:h; return [C,C.getContext('2d',{willReadFrequently:true})]; };
const settle=p=>p<=0?0:p>=1?1:1-Math.pow(2,-8.5*p)*Math.cos(p*9.5);
function tab(c,x,y,txt,s,bg,fg){ c.font=MONO(s); const w=c.measureText(txt).width; c.fillStyle=bg; c.fillRect(x,y,w+s*.9,s*1.5); c.fillStyle=fg; c.textBaseline='middle'; c.textAlign='left'; c.fillText(txt,x+s*.45,y+s*.8); return w+s*.9; }
function put(W,H,data){ const [C,x]=sheet(W,H), im=x.createImageData(W,H); im.data.set(data); x.putImageData(im,0,0); return C; }
function poly(c,p){ c.beginPath(); p.forEach((q,i)=>i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1])); c.closePath(); c.fill(); }
/* a box blur of one plane, edges clamped: the window Unsharp Mask's own box uses */
function box(a,W,H,r){ const t=new Float32Array(Math.max(W,H)), k=1/(2*r+1);
  for(let y=0;y<H;y++){ const o=y*W; let s=0; for(let i=-r;i<=r;i++) s+=a[o+clamp(i,0,W-1)]; for(let x=0;x<W;x++){ t[x]=s*k; s+=a[o+Math.min(W-1,x+r+1)]-a[o+Math.max(0,x-r)]; } for(let x=0;x<W;x++) a[o+x]=t[x]; }
  for(let x=0;x<W;x++){ let s=0; for(let i=-r;i<=r;i++) s+=a[clamp(i,0,H-1)*W+x]; for(let y=0;y<H;y++){ t[y]=s*k; s+=a[Math.min(H-1,y+r+1)*W+x]-a[Math.max(0,y-r)*W+x]; } for(let y=0;y<H;y++) a[y*W+x]=t[y]; } }
const ih=n=>{ n=Math.imul(n^(n>>>16),0x45d9f3b); n=Math.imul(n^(n>>>16),0x45d9f3b); n=n^(n>>>16); return (n>>>0)/4294967296; };
const h2=(x,y,s)=>ih(Math.imul(x,73856093)^Math.imul(y,19349663)^Math.imul(s,83492791));
const vn2=(x,y,s)=>{ const xi=Math.floor(x), yi=Math.floor(y), fx=x-xi, fy=y-yi, u=fx*fx*(3-2*fx), v=fy*fy*(3-2*fy); return lerp(lerp(h2(xi,yi,s),h2(xi+1,yi,s),u),lerp(h2(xi,yi+1,s),h2(xi+1,yi+1,s),u),v); };

window.FX_TILES.push(

/* TEMPORAL DENOISE. A, graded still, split: left of the Bone hairline the night footage as shot, right of it the same frames through
   the effect at Strength .85 (default) and Motion threshold .3, 12.5 fps. The real recursion: out = cur + (prevOut - cur) * Strength/2 * w,
   w the 32-wide block mask, 1 - |block luma change| / (.3 * 255), bilinear-upscaled. Block means come from the grain-free picture.
   Checker k2 measured the real kernel on grain like this (std 21 to 32, 30 fps, 1080): at the default threshold .12 the grain itself
   reads as motion and the noise drops only about 15 %; at .3 it drops 35 % (ratio .654), which is what this tile shows (.62 to .67).
   The effect is modest even then, so the calmer right half is a fair, not dramatic, difference. Extra smoothing (.6 px) is left out:
   it is a fraction of a pixel here. Warmed up on the loop's own last frames, so the seam does not jump. */
{ id:'temporaldenoise', name:'Temporal Denoise', section:'Blur', isNew:true, still:1.2,
  line:'Grain is calmed wherever the shot holds still, while anything that moves keeps its grain and stays sharp.',
  make(px){
    const P=4, FPS=12.5, NF=50, WARM=9, N=160, S=N/100, GN=64, GW=32, BW=N/GW, SPLIT=N/2;
    const ALPHA=.85*.5, THR=.3*255;
    const walkX=f=>lerp(-15,115,f/NF);
    const scene=x=>{
      x.fillStyle='#302822'; x.fillRect(0,0,100,100);
      x.fillStyle='#211b17'; x.fillRect(13.5,0,.7,64); x.fillRect(88.5,0,.7,64); x.fillRect(0,9.5,28,.6); x.fillRect(80,9.5,20,.6);
      /* a roller shutter across the split, so both halves show the same ribs */
      x.fillStyle='#4a484d'; x.fillRect(30,20,48,44);
      for(let y=20.6;y<64;y+=2.3){ x.fillStyle='#64636a'; x.fillRect(30,y,48,.95); x.fillStyle='#2a292e'; x.fillRect(30,y+1.55,48,.5); }
      x.fillStyle='#19181b'; x.fillRect(28.4,15.6,51.2,4.6); x.fillStyle='#131215'; x.fillRect(28.4,20.2,1.7,43.8); x.fillRect(77.9,20.2,1.7,43.8);
      /* pavement */
      x.fillStyle='#29231d'; x.fillRect(0,64,100,36);
      x.fillStyle='#4a4136'; x.fillRect(0,64,100,1.1);
      x.fillStyle='#17140f'; x.fillRect(0,77,100,.6); x.fillRect(0,92,100,.7); [12,47,81].forEach(v=>x.fillRect(v,65.1,.6,11.9)); [4,40,77].forEach(v=>x.fillRect(v,77.6,.7,14.4));
      /* one lamp over the shutter, a little right of centre, and the light it throws */
      x.globalCompositeOperation='lighter';
      let g=x.createRadialGradient(56,10,0,56,10,64); g.addColorStop(0,'rgba(255,182,104,.85)'); g.addColorStop(.32,'rgba(200,124,64,.44)'); g.addColorStop(.72,'rgba(90,52,26,.12)'); g.addColorStop(1,'rgba(0,0,0,0)');
      x.fillStyle=g; x.fillRect(0,0,100,64);
      x.save(); x.beginPath(); x.rect(0,64,100,36); x.clip(); x.translate(54,72); x.scale(1,.34);
      g=x.createRadialGradient(0,0,0,0,0,62); g.addColorStop(0,'rgba(255,176,96,.62)'); g.addColorStop(.45,'rgba(160,96,48,.26)'); g.addColorStop(1,'rgba(0,0,0,0)'); x.fillStyle=g; x.fillRect(-80,-160,160,320); x.restore();
      x.globalCompositeOperation='source-over';
      x.fillStyle='#0f0d0c'; x.fillRect(52.4,4.2,7.2,4.2); x.fillRect(55.4,0,1.2,4.4);
      x.fillStyle='#fff0cc'; x.beginPath(); x.ellipse(56,9,3,1.05,0,0,TAU); x.fill();
    };
    /* a walking figure, 52 units tall, facing right */
    const walker=(x,X,ph,col,rim)=>{
      const top=38+.7*Math.abs(Math.sin(ph)), sh=top+9.6, hip=top+27;
      x.fillStyle=col; x.strokeStyle=col; x.lineCap='round'; x.lineJoin='round';
      const limb=(x0,y0,a,l1,b,l2,w1,w2)=>{ const kx=x0+Math.sin(a)*l1, ky=y0+Math.cos(a)*l1, fx=kx+Math.sin(b)*l2, fy=ky+Math.cos(b)*l2;
        x.lineWidth=w1; x.beginPath(); x.moveTo(x0,y0); x.lineTo(kx,ky); x.stroke(); x.lineWidth=w2; x.beginPath(); x.moveTo(kx,ky); x.lineTo(fx,fy); x.stroke(); return [fx,fy]; };
      const leg=i=>{ const ps=ph+i*Math.PI, a=.44*Math.sin(ps), b=a-.85*Math.max(0,Math.cos(ps)); const f=limb(X+.4,hip,a,12.2,b,12.4,4.4,3.4); x.lineWidth=2.3; x.beginPath(); x.moveTo(f[0]-.6,f[1]); x.lineTo(f[0]+3,f[1]+.2); x.stroke(); };
      const arm=i=>{ const ps=ph+i*Math.PI, a=-.4*Math.sin(ps); limb(X+.6,sh+1.2,a,10,a+.38,8.6,2.9,2.4); };
      if(!rim) leg(1); arm(0);
      poly(x,[[X-4.2,sh-.6],[X+4.8,sh-.8],[X+5.2,top+31.5],[X-4.6,top+31.8]]);
      x.beginPath(); x.arc(X-2.6,sh+1,2.2,0,TAU); x.arc(X+3.2,sh+.9,2.2,0,TAU); x.fill();
      x.fillRect(X-1,top+5.6,2.8,sh-top-5);
      if(!rim) leg(0); arm(1);
      x.beginPath(); x.arc(X+1,top+3.6,3.4,0,TAU); x.fill();
    };
    const [BG,bg]=sheet(N); bg.setTransform(S,0,0,S,0,0); scene(bg);
    const [AT,at]=sheetR(N,N*NF);
    for(let f=0;f<NF;f++){ const X=walkX(f), ph=f/NF*TAU*3.5;
      at.setTransform(1,0,0,1,0,0); at.drawImage(BG,0,f*N);
      at.setTransform(S,0,0,S,0,f*N); at.save(); at.translate(-.5,-.4); walker(at,X,ph,'#7a4e2c',true); at.restore(); walker(at,X,ph,'#0d0b0a'); }
    const src=at.getImageData(0,0,N,N*NF).data;
    const n=N*N, out=new Uint8ClampedArray(n*4*NF), prev=new Float32Array(n*3), prevC=new Float32Array(n*3), cur=new Float32Array(n*3);
    const bc=new Float32Array(GW*GW), bh=new Float32Array(GW*GW), mk=new Float32Array(GW*GW);
    const nl=new Float32Array(GN*GN), nb=new Float32Array(GN*GN), nr=new Float32Array(GN*GN);
    /* the mask's bilinear upscale, as a canvas draws it: sample at pixel centres, clamped */
    const I0=new Int32Array(N), I1=new Int32Array(N), FW=new Float32Array(N);
    for(let x=0;x<N;x++){ let u=(x+.5)/BW-.5; u=u<0?0:u>GW-1?GW-1:u; I0[x]=Math.floor(u); I1[x]=Math.min(GW-1,I0[x]+1); FW[x]=u-I0[x]; }
    const BI=new Int32Array(N); for(let x=0;x<N;x++) BI[x]=(x/BW)|0;
    /* grain: a 64 x 64 field per frame, read bilinearly so it clumps softly rather than in squares */
    const G0=new Int32Array(N), G1=new Int32Array(N), GF=new Float32Array(N);
    for(let x=0;x<N;x++){ let u=(x+.5)*GN/N-.5; u=u<0?0:u>GN-1?GN-1:u; G0[x]=Math.floor(u); G1[x]=Math.min(GN-1,G0[x]+1); GF[x]=u-G0[x]; }
    const tmp=new Float32Array(GN*N), FL=new Float32Array(n), FB=new Float32Array(n), FC=new Float32Array(n);
    const up=(a,F)=>{ for(let gy=0;gy<GN;gy++){ const o=gy*GN, t=gy*N; for(let x=0;x<N;x++){ const fx=GF[x]; tmp[t+x]=a[o+G0[x]]*(1-fx)+a[o+G1[x]]*fx; } }
      for(let y=0;y<N;y++){ const t0=G0[y]*N, t1=G1[y]*N, fy=GF[y], r=y*N; for(let x=0;x<N;x++) F[r+x]=tmp[t0+x]*(1-fy)+tmp[t1+x]*fy; } };
    for(let s=-WARM;s<NF;s++){
      const f=(s+NF)%NF, o=f*n*4, R=rng(500+f);
      for(let i=0;i<GN*GN;i++){ nl[i]=(R()+R()-1)*2.449*32; nb[i]=(R()+R()-1)*2.449*6; nr[i]=(R()+R()-1)*2.449*6; }
      up(nl,FL); up(nb,FB); up(nr,FC);
      for(let y=0;y<N;y++){ for(let x=0;x<N;x++){ const j=y*N+x, i=o+j*4, L=FL[j], cb=FB[j], cr=FC[j];
        let v=src[i]+L+1.402*cr; cur[j*3]=v<0?0:v>255?255:Math.round(v);
        v=src[i+1]+L-.344*cb-.714*cr; cur[j*3+1]=v<0?0:v>255?255:Math.round(v);
        v=src[i+2]+L+1.772*cb; cur[j*3+2]=v<0?0:v>255?255:Math.round(v); } }
      if(s>=0) for(let y=0;y<N;y++) for(let x=0;x<SPLIT;x++){ const j=y*N+x, i=o+j*4; out[i]=cur[j*3]; out[i+1]=cur[j*3+1]; out[i+2]=cur[j*3+2]; out[i+3]=255; }
      if(s>-WARM){
        bc.fill(0); bh.fill(0);
        for(let y=0;y<N;y++){ const by=BI[y]*GW; for(let x=0;x<N;x++){ const j=y*N+x, i=o+j*4, b=by+BI[x]; bc[b]+=.299*src[i]+.587*src[i+1]+.114*src[i+2]; bh[b]+=.299*prevC[j*3]+.587*prevC[j*3+1]+.114*prevC[j*3+2]; } }
        for(let b=0;b<GW*GW;b++){ const dl=Math.abs(bc[b]-bh[b])/(BW*BW); mk[b]=dl>=THR?0:1-dl/THR; }
        for(let y=0;y<N;y++){ const y0=I0[y]*GW, y1=I1[y]*GW, fy=FW[y];
          for(let x=0;x<N;x++){ const x0=I0[x], x1=I1[x], fx=FW[x], w=(mk[y0+x0]*(1-fx)+mk[y0+x1]*fx)*(1-fy)+(mk[y1+x0]*(1-fx)+mk[y1+x1]*fx)*fy, a=ALPHA*w, j=y*N+x, i=o+j*4;
            for(let k=0;k<3;k++){ const q=j*3+k; cur[q]=Math.round(cur[q]+(prev[q]-cur[q])*a); prevC[q]=prevC[q]+(src[i+k]-prevC[q])*(1-a); } } }
      } else { for(let j=0;j<n;j++) for(let k=0;k<3;k++) prevC[j*3+k]=src[o+j*4+k]; }
      prev.set(cur);
      if(s>=0) for(let y=0;y<N;y++) for(let x=SPLIT;x<N;x++){ const j=y*N+x, i=o+j*4; out[i]=cur[j*3]; out[i+1]=cur[j*3+1]; out[i+2]=cur[j*3+2]; out[i+3]=255; }
    }
    const [OUT,ox]=sheet(N,N*NF), oim=ox.createImageData(N,N*NF); oim.data.set(out); ox.putImageData(oim,0,0);
    return (c,t)=>{
      const f=Math.min(NF-1,Math.floor(mod(t,P)*FPS));
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; c.imageSmoothingEnabled=true;
      c.drawImage(OUT,0,f*N,N,N,0,0,px,px);
      reset(c,px);
      c.fillStyle=BONE; c.fillRect(49.78,0,.45,100);
      tab(c,3,92,'OFF',4.4,COAL,DIM);
      c.font=MONO(4.4); const w=c.measureText('ON').width+4.4*.9; tab(c,97-w,92,'ON',4.4,COAL,TEXT);
    };
  } },

/* UNSHARP MASK. F, viewer overlay: a 400% view of a soft-focus watch dial, 270 px for 270 project px, so Radius 3 is 3 px here as it is
   in an export. Amount stepped 0, .4, .8, 1.2. The kernel's own sum, out = src + (src - box(src, r)) * Amount, one box, edges clamped,
   per channel (checked byte for byte against the app's render). The trace under the picture is the brightness along the hairline:
   the soft ramps steepen and grow a light and a dark lip. */
{ id:'unsharpmask', name:'Unsharp Mask', section:'Blur', isNew:true, still:2.4,
  line:'Edges get crisper: the light side of each edge is pushed lighter and the dark side darker.',
  make(px){
    const P=4.2, N=270, S=N/100, PH=Math.round(70*S), YR=29.5, O=[13,80];
    const at=(deg,r)=>{ const a=deg*TAU/360; return [O[0]+Math.sin(a)*r, O[1]-Math.cos(a)*r]; };
    const ring=(x,r)=>{ x.beginPath(); x.arc(O[0],O[1],r,0,TAU); };
    const bar=(x,deg,r0,r1,w0,w1)=>{ const a=deg*TAU/360, s=Math.sin(a), c=Math.cos(a), nx=c, ny=s; const p0=at(deg,r0), p1=at(deg,r1);
      poly(x,[[p0[0]-nx*w0/2,p0[1]-ny*w0/2],[p1[0]-nx*w1/2,p1[1]-ny*w1/2],[p1[0]+nx*w1/2,p1[1]+ny*w1/2],[p0[0]+nx*w0/2,p0[1]+ny*w0/2]]); };
    const dial=x=>{
      const g=x.createLinearGradient(50,0,100,48); g.addColorStop(0,'#a3a5a8'); g.addColorStop(.45,'#6a6d71'); g.addColorStop(1,'#303236'); x.fillStyle=g; x.fillRect(0,0,100,70);
      x.fillStyle='#1c1b1a'; ring(x,75); x.fill();
      x.fillStyle='#e9e3d3'; ring(x,70); x.fill();
      x.strokeStyle='#1b1916'; x.lineWidth=.5; ring(x,68.2); x.stroke(); ring(x,61.2); x.stroke();
      x.fillStyle='#1b1916';
      for(let k=0;k<60;k++){ if(k%5===0) continue; bar(x,k*6,62,67.4,.55,.55); }
      for(let k=0;k<12;k++) bar(x,k*30,45,60,4.2,3.2);
      x.font=SANS(13); x.textAlign='center'; x.textBaseline='middle'; const q=at(0,35); x.fillText('12',q[0],q[1]);
      /* hands: hour, minute (with a lume strip), and the vermilion seconds */
      x.fillStyle='#141210'; bar(x,63,-6,40,6,4.4); x.fillStyle='#d8d2bf'; bar(x,63,10,36,2.4,1.8);
      x.fillStyle='#141210'; bar(x,36,-6,64,4.6,1.6); x.fillStyle='#d8d2bf'; bar(x,36,14,58,1.8,.8);
      x.strokeStyle=VERM; x.lineWidth=.7; x.lineCap='butt'; const s0=at(14,-10), s1=at(14,66); x.beginPath(); x.moveTo(s0[0],s0[1]); x.lineTo(s1[0],s1[1]); x.stroke();
    };
    const [PC,pc]=sheetR(N,PH); pc.setTransform(S,0,0,S,0,0); dial(pc);
    const im=pc.getImageData(0,0,N,PH).data, n=N*PH;
    const sr=new Float32Array(n), sg=new Float32Array(n), sb=new Float32Array(n);
    for(let i=0;i<n;i++){ sr[i]=im[i*4]; sg[i]=im[i*4+1]; sb[i]=im[i*4+2]; }
    for(const a of [sr,sg,sb]){ box(a,N,PH,2); box(a,N,PH,2); }          /* the source: a soft focus */
    const br=sr.slice(), bgr=sg.slice(), bb=sb.slice(); for(const a of [br,bgr,bb]) box(a,N,PH,3);   /* the effect's one box, Radius 3 */
    const AM=[0,.4,.8,1.2], FR=[], PR=[], row=Math.round(YR*S)*N;
    for(const a of AM){ const o=new Uint8ClampedArray(n*4), pr=new Float32Array(N);
      for(let i=0;i<n;i++){ const j=i*4; o[j]=sr[i]+(sr[i]-br[i])*a; o[j+1]=sg[i]+(sg[i]-bgr[i])*a; o[j+2]=sb[i]+(sb[i]-bb[i])*a; o[j+3]=255; }
      for(let x=0;x<N;x++){ const j=(row+x)*4; pr[x]=.299*o[j]+.587*o[j+1]+.114*o[j+2]; }
      FR.push(put(N,PH,o)); PR.push(pr); }
    const TY0=77.5, TY1=97;
    return (c,t)=>{
      const u=mod(t,P), k=u<.7?0:u<.85?1:u<1?2:u<3.45?3:u<3.55?2:u<3.65?1:0;
      reset(c,px); c.fillStyle=NAVY; c.fillRect(0,0,100,100);
      c.drawImage(FR[k],0,0,100,70);
      /* the hairline the trace reads, with its two handles */
      c.fillStyle=DIM; c.fillRect(0,YR-.2,100,.4);
      c.fillStyle=TEAL; c.fillRect(0,YR-1.1,2.2,2.2); c.fillRect(97.8,YR-1.1,2.2,2.2);
      /* the trace: 0 and 255 marked, brightness along the line */
      c.fillStyle=HAIR; c.fillRect(0,TY0-.2,100,.4); c.fillRect(0,TY1-.2,100,.4);
      const trace=(pr,col,lw)=>{ c.strokeStyle=col; c.lineWidth=lw; c.lineJoin='round'; c.beginPath();
        for(let x=0;x<N;x++){ const X=(x+.5)/S, Y=TY1-pr[x]/255*(TY1-TY0); x?c.lineTo(X,Y):c.moveTo(X,Y); } c.stroke(); };
      if(k) trace(PR[0],'#66718a',.5);   /* the line as shot, under the sharpened one */
      trace(PR[k],TEXT,.6);
      c.font=MONO(4.4); c.textBaseline='middle'; c.textAlign='left'; c.fillStyle=TEXT; c.fillText('AMOUNT '+AM[k].toFixed(2),3,73.4);
      c.textAlign='right'; c.fillStyle=DIM; c.fillText('R 3  400%',97,73.4);
    };
  } },

/* BURST STREAKS. G, cut paper: an extractor fan in a dark wall with daylight behind it; ink and bone, the one vermilion is the tab.
   The kernel's own rays (Quality 24 taps toward Centre, each weighted (luma/255)^2 by a falling decay, summed, scaled by strength/taps,
   screened over; ported line for line and checked byte for byte against the app's render) are run once on the fan with Centre on its
   hub. The kernel turns with its centre and the opening is round, so turning that streak plate with the blades is the kernel run on the
   turned fan. Amount steps .25, .5, .7 on threes while the blades turn 2 degrees a frame (five blades: 72 degrees is a whole loop). */
{ id:'zoomstreaks', name:'Burst Streaks', section:'Blur', isNew:true, still:2.0,
  line:'The bright parts of the picture throw streaks of light outward from a centre point you place.',
  make(px){
    const P=4.5, FPS=8, HX=42, HY=46, R0=30, PAD=80, M=2, NR=2*PAD*M, STEPS=24, AM=[.25,.5,.7];
    const JIT=[[0,0,0,0],[.7,-1.3,.9,-.5],[-.9,1,-.6,.8],[.5,.7,-1.1,.3],[-.4,-.8,.7,-1]];   /* each blade cut a little untrue */
    const fan=(x,rot)=>{
      x.fillStyle=INK; x.fillRect(HX-PAD,HY-PAD,2*PAD,2*PAD);
      /* the housing: a square plate, cut a touch out of true, four bolts; dark enough to throw no rays of its own */
      x.fillStyle='#2b2723'; poly(x,[[HX-37,HY-36.4],[HX+36.6,HY-37],[HX+37.2,HY+36.6],[HX-36.6,HY+37.2]]);
      x.fillStyle=INK; for(const [bx,by] of [[-31.5,-31.5],[31.5,-31.5],[31.5,31.5],[-31.5,31.5]]) x.fillRect(HX+bx-1.3,HY+by-1.3,2.6,2.6);
      x.fillStyle=BONE; x.beginPath(); x.arc(HX,HY,R0,0,TAU); x.fill();
      x.fillStyle=INK;
      for(let i=0;i<5;i++){ const a0=rot+i*TAU/5, j=JIT[i], at=(r,deg)=>{ const a=a0+deg*TAU/360; return [HX+Math.cos(a)*r,HY+Math.sin(a)*r]; };
        poly(x,[at(5,-17+j[0]),at(28.4,-29+j[1]),at(29.3,11+j[2]),at(5,15+j[3])]); }
      const hub=[]; for(let i=0;i<7;i++){ const a=rot+.4+i*TAU/7; hub.push([HX+Math.cos(a)*6.6,HY+Math.sin(a)*6.6]); } poly(x,hub);
    };
    /* the streak plate: the fan at rest on a plate wide enough to cover the frame at any turn, its centre on the hub */
    const [,rp]=sheetR(NR); rp.setTransform(M,0,0,M,M*(PAD-HX),M*(PAD-HY)); fan(rp,0);
    const s=rp.getImageData(0,0,NR,NR).data, W4=NR*4, cx=NR/2, cy=NR/2;
    const rays=amt=>{ const o=new Uint8ClampedArray(NR*NR*4), st=.16+.74*amt, norm=st/STEPS;
      for(let y=0;y<NR;y++) for(let x=0;x<NR;x++){ const i=y*W4+x*4, dx=cx-x, dy=cy-y; let ar=0,ag=0,ab=0,ws=0;
        for(let k=1;k<=STEPS;k++){ const f=k/STEPS*st; let ix=(x+dx*f)|0, iy=(y+dy*f)|0; ix=ix<0?0:ix>NR-1?NR-1:ix; iy=iy<0?0:iy>NR-1?NR-1:iy;
          const si=iy*W4+ix*4, r=s[si], g=s[si+1], b=s[si+2], lu=(r*.299+g*.587+b*.114)*(s[si+3]/255), dec=1-k/(STEPS+1); let bw=lu/255; bw*=bw; const wt=bw*dec; ar+=r*wt; ag+=g*wt; ab+=b*wt; ws+=wt; }
        if(ws>0){ o[i]=Math.min(255,ar*norm); o[i+1]=Math.min(255,ag*norm); o[i+2]=Math.min(255,ab*norm); } o[i+3]=255; }
      return put(NR,NR,o); };
    const RAYS=AM.map(rays);
    return (c,t)=>{
      const f=Math.floor(mod(t,P)*FPS), q=f/FPS, rot=(f%36)*2*TAU/360;
      const k=q<.6?0:q<.725?1:q<.85?2:q<3.6?3:q<3.725?2:q<3.85?1:0;
      reset(c,px); c.save(); c.beginPath(); c.rect(0,0,100,100); c.clip();
      fan(c,rot);
      if(k){ c.globalCompositeOperation='screen'; c.translate(HX,HY); c.rotate(rot); c.drawImage(RAYS[k-1],-PAD,-PAD,2*PAD,2*PAD); }
      c.restore(); reset(c,px);
      tab(c,3,91.6,'AMOUNT '+(k?AM[k-1].toFixed(2):'0.00'),4.4,VERM,INK);
    };
  } },

/* CARTOON. A, graded still: an electric guitar hung on a slate wall, drawn and lit here (sunburst carved top, chrome, gold knobs), then
   PIXEL_FX.cartoon's own three stages run on it as a 1080 frame drawn 240 px wide: two Kuwahara passes (Smoothing 6), luma cut into
   4 Shading steps keeping each hue (Saturation 120 %), a Sobel outline grown to Edge width 10 (Edge threshold 15 %, soft knee).
   Ported line for line and checked byte for byte against the app's render. Stepped A/B, hard cuts. */
{ id:'cartoon', name:'Cartoon', section:'Stylize', isNew:true, still:2.2,
  line:'The picture flattens into a few shades of each colour, with dark outlines drawn round the shapes.',
  make(px){
    const P=4.4, N=240, S=N/100, PS=N/1080;
    const nrm=(a,b,c)=>{ const l=Math.hypot(a,b,c); return [a/l,b/l,c/l]; };
    const Lt=nrm(-.45,-.62,.64), Hv=nrm(Lt[0],Lt[1],Lt[2]+1);
    /* body space: y runs from the strap button (+) up to the neck (-), so the neck leaves the frame top right */
    const TH=35*TAU/360, CT=Math.cos(TH), ST=Math.sin(TH), BX=43, BY=63, SC=1.5;
    const toBody=(u,w)=>{ const dx=(u-BX)/SC, dy=(w-BY)/SC; return [dx*CT+dy*ST, -dx*ST+dy*CT]; };
    const toFrame=(nx,ny)=>[nx*CT-ny*ST, nx*ST+ny*CT];
    const sdE=(x,y,cx,cy,rx,ry)=>{ const X=(x-cx)/rx, Y=(y-cy)/ry; return (Math.hypot(X,Y)-1)*Math.min(rx,ry); };
    const smin=(a,b,k)=>{ const h=clamp(.5+.5*(b-a)/k); return lerp(b,a,h)-k*h*(1-h); };
    const bodyD=(x,y)=>Math.max(smin(sdE(x,y,0,9,20,17),sdE(x,y,-1,-10,14.5,12.5),5),-(Math.hypot(x-12.5,y+18)-8.4));
    const rbox=(x,y,cx,cy,hx,hy,r)=>{ const qx=Math.abs(x-cx)-hx+r, qy=Math.abs(y-cy)-hy+r; return Math.hypot(Math.max(qx,0),Math.max(qy,0))+Math.min(Math.max(qx,qy),0)-r; };
    const lit=(n,base,amb,dif,sp,pw)=>{ const [fx,fy]=toFrame(n[0],n[1]), m=nrm(fx,fy,n[2]); const d=Math.max(0,m[0]*Lt[0]+m[1]*Lt[1]+m[2]*Lt[2]), h=Math.max(0,m[0]*Hv[0]+m[1]*Hv[1]+m[2]*Hv[2]), s=sp*255*Math.pow(h,pw);
      return [base[0]*(amb+dif*d)+s, base[1]*(amb+dif*d)+s, base[2]*(amb+dif*d)+s]; };
    const KN=[[10.5,12.5],[16.2,8.6],[11.6,19.6],[17.3,15.6]];
    const STR=[0,1,2,3,4,5].map(i=>[-4+i*1.6,-2.5+i*1]);   /* each string's x at the tailpiece (y 15.2) and at the nut (y -68) */
    const shade=(u,w)=>{
      /* the wall, and the guitar's shadow on it */
      const k0=1.06-.16*((u+w)/200); let col=[90*k0,106*k0,114*k0];   /* kept inside one Shading step, so the wall stays one flat tone */
      { const [sx,sy]=toBody(u-2.6,w-3.4); const d=Math.min(bodyD(sx,sy),Math.max(Math.abs(sx)-3.9,sy+17)); const a=.55*clamp((.8-d)/1.6); col=col.map(v=>v*(1-a)); }
      const [x,y]=toBody(u,w), d=bodyD(x,y);
      if(d<0){
        const dep=-d;
        if(dep<.85){ col=lit([0,0,1],[226,214,186],.45,.6,.2,30); }
        else{
          const e=.3, gx=(bodyD(x+e,y)-bodyD(x-e,y))/(2*e), gy=(bodyD(x,y+e)-bodyD(x,y-e))/(2*e), sl=(2.6/4.5)*Math.exp(-dep/4.5);
          const n=nrm(gx*sl,gy*sl,1), t=clamp((dep-.85)/12.5), fl=1+.06*Math.sin(x*1.1+6*vn2(x*.12,y*.5,3));
          const C0=[34,13,7], C1=[146,38,16], C2=[228,150,56];
          const base=t<.4?C0.map((v,i)=>lerp(v,C1[i],E.inOut(t/.4))):C1.map((v,i)=>lerp(v,C2[i],E.inOut((t-.4)/.6)));
          col=lit(n,base.map(v=>v*fl),.42,.72,.75,60);
          const br=.14*255*Math.pow(Math.max(0,n[0]*.3+n[1]*-.2+n[2]*.93),8); col=col.map(v=>v+br*.25);
        }
        /* hardware, all on the top */
        for(const cy of [-6.5,4.2]){ const pd=rbox(x,y,0,cy,7.4,3.6,1.2); if(pd<0){ const v=(y-cy)/3.6, n=[0,v*.8,Math.sqrt(Math.max(.05,1-v*v*.64))]; col=lit(n,[196,200,206],.35,.62,.9,40);
          for(let p=0;p<6;p++) for(const oy of [-1.5,1.5]){ if(Math.hypot(x-(-5+p*2),y-(cy+oy))<.55) col=[96,98,104]; } if(pd>-.35) col=col.map(v=>v*.72); } }
        for(const [cy,hy,hx] of [[10.6,1.1,8],[15.2,1.3,8.6]]){ if(rbox(x,y,0,cy,hx,hy,.6)<0){ const v=(y-cy)/hy; col=lit([0,v*.9,Math.sqrt(Math.max(.05,1-v*v*.81))],[200,203,208],.35,.62,.9,40); } }
        for(const [kx,ky] of KN){ const q=Math.hypot(x-kx,y-ky); if(q<2.3){ const nx=(x-kx)/2.3, ny=(y-ky)/2.3; col=lit([nx*.7,ny*.7,Math.sqrt(Math.max(.05,1-(nx*nx+ny*ny)*.49))],[212,166,74],.38,.66,.6,24); if(q>1.95) col=col.map(v=>v*.6); } }
      }
      /* the neck and its fingerboard, over the upper bout and away off the frame */
      if(Math.abs(x)<3.9&&y<-17.5){ const v=x/3.9; col=lit([v*.8,0,Math.sqrt(1-v*v*.64)],[96,38,18],.4,.66,.3,30);
        if(Math.abs(x)<3.3){ col=lit([v*.5,0,.87],[46,26,17],.45,.6,.15,20); const fy=((-21-y)%3.1+3.1)%3.1; if(y<-21&&fy<.24) col=[186,182,172]; } }
      /* the strings */
      if(y<15.2) for(const [xt,xn] of STR){ const sx=lerp(xt,xn,(15.2-y)/83.2); if(Math.abs(x-sx)<.2){ col=[214,216,221]; break; } }
      return col;
    };
    const n=N*N, src=new Uint8ClampedArray(n*4), R=rng(66);
    /* two samples a pixel, on its diagonal: enough to smooth the cut edges */
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){ const q0=shade((x+.25)/S,(y+.3)/S), q1=shade((x+.75)/S,(y+.7)/S);
      const gr=(R()-.5)*3, i=(y*N+x)*4; src[i]=(q0[0]+q1[0])/2+gr; src[i+1]=(q0[1]+q1[1])/2+gr; src[i+2]=(q0[2]+q1[2])/2+gr; src[i+3]=255; }
    /* PIXEL_FX.cartoon, parameters as project px on a 1080 frame drawn N px wide */
    const SMOOTH=6, STEPS=4, WID=10, THR=15*2.55, KNEE=24, SAT=1.2;
    const luma=(a,i)=>((299*a[i]+587*a[i+1]+114*a[i+2]+500)/1000)|0;
    const kuwa=(s,d,W,H,h)=>{ const W1=W+1, I=[0,1,2,3,4,5].map(()=>new Float64Array(W1*(H+1)));
      for(let y=0;y<H;y++){ const acc=[0,0,0,0,0,0]; for(let x=0;x<W;x++){ const i=(y*W+x)*4, yy=luma(s,i), v=[1,s[i],s[i+1],s[i+2],yy,yy*yy]; for(let k=0;k<6;k++){ acc[k]+=v[k]; I[k][(y+1)*W1+x+1]=I[k][y*W1+x+1]+acc[k]; } } }
      const sum=(k,x0,y0,x1,y1)=>{ x0=Math.max(0,x0); y0=Math.max(0,y0); x1=Math.min(W-1,x1); y1=Math.min(H-1,y1); if(x0>x1||y0>y1) return 0; const A=I[k]; return A[(y1+1)*W1+x1+1]-A[y0*W1+x1+1]-A[(y1+1)*W1+x0]+A[y0*W1+x0]; };
      for(let y=0;y<H;y++) for(let x=0;x<W;x++){ let best=Infinity, bx=0, by=0, bn=0;
        for(let q=0;q<4;q++){ const cx=x+((q&1)?h:-h), cy=y+(q<2?-h:h), x0=cx-h, y0=cy-h, x1=cx+h, y1=cy+h, a=sum(0,x0,y0,x1,y1); if(!(a>0)) continue;
          const m=sum(4,x0,y0,x1,y1)/a, va=sum(5,x0,y0,x1,y1)/a-m*m; if(va<best){ best=va; bx=cx; by=cy; bn=a; } }
        if(bn>0){ const i=(y*W+x)*4; d[i]=sum(1,bx-h,by-h,bx+h,by+h)/bn; d[i+1]=sum(2,bx-h,by-h,bx+h,by+h)/bn; d[i+2]=sum(3,bx-h,by-h,bx+h,by+h)/bn; } } };
    const h=Math.min(16,Math.round(SMOOTH*PS/2)), A=new Uint8ClampedArray(src), B=new Uint8ClampedArray(src);
    let sm=src; if(h>=1){ kuwa(src,A,N,N,h); B.set(A); kuwa(A,B,N,N,h); sm=B; }
    const Y=new Float32Array(n), EG=new Float32Array(n), EF=new Float32Array(n);
    for(let j=0;j<n;j++) Y[j]=luma(sm,j*4)*255;
    for(let y=0;y<N;y++){ const ru=(y>0?y-1:0)*N, rc=y*N, rd=(y<N-1?y+1:N-1)*N;
      for(let x=0;x<N;x++){ const xl=x>0?x-1:0, xr=x<N-1?x+1:N-1;
        const gx=(Y[ru+xr]+2*Y[rc+xr]+Y[rd+xr])-(Y[ru+xl]+2*Y[rc+xl]+Y[rd+xl]), gy=(Y[rd+xl]+2*Y[rd+x]+Y[rd+xr])-(Y[ru+xl]+2*Y[ru+x]+Y[ru+xr]);
        const mg=Math.sqrt(gx*gx+gy*gy)/1020; EG[rc+x]=mg<=THR?0:mg>=THR+KNEE?1:(u=>u*u*(3-2*u))((mg-THR)/KNEE); } }
    const Wp=WID*PS, grow=(s,d,ri,fr,rows)=>{ for(let q=0;q<N;q++) for(let k=0;k<N;k++){ let best=0; const at=c=>rows?s[q*N+c]:s[c*N+q];
        for(let c=Math.max(0,k-ri);c<=Math.min(N-1,k+ri);c++){ const v=at(c); if(v>best) best=v; }
        if(fr>0){ if(k-ri-1>=0){ const v=at(k-ri-1)*fr; if(v>best) best=v; } if(k+ri+1<N){ const v=at(k+ri+1)*fr; if(v>best) best=v; } }
        if(rows) d[q*N+k]=best; else d[k*N+q]=best; } };
    if(Wp<2){ for(let j=0;j<n;j++) EG[j]*=Wp/2; } else if(Wp>2){ const r=(Wp-2)/2, ri=Math.floor(r), fr=r-ri; grow(EG,EF,ri,fr,true); grow(EF,EG,ri,fr,false); }
    const LV=[]; for(let k=0;k<STEPS;k++) LV.push(Math.round((2*k+1)*255/(2*STEPS)));
    const toon=new Uint8ClampedArray(n*4);
    for(let j=0,i=0;j<n;j++,i+=4){ const r=sm[i], g=sm[i+1], b=sm[i+2], Yi=luma(sm,i), Lf=(299*r+587*g+114*b)/1000, q=LV[(Yi*STEPS)>>8];
      const cr=(r-Lf)*SAT, cg=(g-Lf)*SAT, cb=(b-Lf)*SAT, hi=Math.max(cr,cg,cb), lo=Math.min(cr,cg,cb); let f=1;
      if(q+hi>255) f=(255-q)/hi; if(q+lo<0){ const f2=q/-lo; if(f2<f) f=f2; }
      let Rr=q+cr*f, G=q+cg*f, Bb=q+cb*f; const e=EG[j]; if(e>0){ Rr-=Rr*e; G-=G*e; Bb-=Bb*e; }
      toon[i]=Rr; toon[i+1]=G; toon[i+2]=Bb; toon[i+3]=255; }
    const SRC=put(N,N,src), TOON=put(N,N,toon);
    return (c,t)=>{ const u=mod(t,P); reset(c,px); c.drawImage(u>=.9&&u<4?TOON:SRC,0,0,100,100); };
  } },

/* COMPRESSION CRUNCH. H, broadcast bench: concert footage drawn here (a singer in a follow spot, stage haze, par cans, the crowd), a 1080
   frame drawn 270 px wide, so 4 px here is 16 project px. The kernel's own passes, ported line for line and checked byte for byte
   against the app's render: chroma averaged per Colour block, luma per Block with the DC term on a ladder of 1 + 30q, flat blocks
   flattened, busy ones overshot by Ringing, then Fry. Quality steps off, .6, .3 (the default); Block 16, Colour block 32. */
{ id:'compresscrunch', name:'Compression Crunch', section:'Stylize', isNew:true, still:2.2,
  line:'Smooth areas break into blocky bands and colour smears into squares, while sharp edges stay crisp.',
  make(px){
    const P=4.4, W=270, H=204, S=W/100, ps=W/1080, PH=H/S, BLK=16, CBLK=32;
    const scene=x=>{
      x.fillStyle='#050407'; x.fillRect(0,0,100,PH);
      /* a cold wash of haze from the back right */
      let g=x.createRadialGradient(84,10,0,84,10,82); g.addColorStop(0,'rgba(46,80,196,.72)'); g.addColorStop(.45,'rgba(28,46,128,.32)'); g.addColorStop(1,'rgba(0,0,0,0)'); x.fillStyle=g; x.fillRect(0,0,100,PH);
      /* the follow spot: a warm cone from up left onto the singer, built up in soft layers of haze */
      x.globalCompositeOperation='lighter';
      const AX=20, AY=-8, FX=52, FY=63, dx=FX-AX, dy=FY-AY, L=Math.hypot(dx,dy), nx=-dy/L, ny=dx/L;
      for(let k=0;k<8;k++){ const s=.5+k*.17, w0=1.1*s, w1=12.5*s; x.fillStyle='rgba(255,186,116,.075)'; poly(x,[[AX+nx*w0,AY+ny*w0],[FX+nx*w1,FY+ny*w1],[FX-nx*w1,FY-ny*w1],[AX-nx*w0,AY-ny*w0]]); }
      x.save(); x.translate(FX,FY+1); x.scale(1,.2); g=x.createRadialGradient(0,0,0,0,0,22); g.addColorStop(0,'rgba(255,212,164,.9)'); g.addColorStop(1,'rgba(0,0,0,0)'); x.fillStyle=g; x.fillRect(-26,-26,52,52); x.restore();
      /* par cans on the truss: small hard sources, red, amber, blue */
      x.globalCompositeOperation='source-over'; x.fillStyle='#0c0b10'; x.fillRect(0,3.2,100,1.6);
      x.globalCompositeOperation='lighter';
      [[8,'255,64,48'],[19,'255,170,64'],[30,'70,112,255'],[70,'70,112,255'],[81,'255,170,64'],[92,'255,64,48']].forEach(([X,cl])=>{ g=x.createRadialGradient(X,6.4,0,X,6.4,5.5); g.addColorStop(0,'rgba('+cl+',.85)'); g.addColorStop(1,'rgba('+cl+',0)'); x.fillStyle=g; x.fillRect(X-6,.4,12,12); x.fillStyle='#fffaf0'; x.beginPath(); x.arc(X,6.2,.75,0,TAU); x.fill(); });
      x.globalCompositeOperation='source-over';
      x.fillStyle='#09080b'; x.fillRect(0,64.6,100,PH-64.6);
      /* the singer */
      const SIL='#050407'; x.fillStyle=SIL; x.strokeStyle=SIL; x.lineCap='round'; x.lineJoin='round';
      const ln=(w,p)=>{ x.lineWidth=w; x.beginPath(); p.forEach((q,i)=>i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1])); x.stroke(); };
      ln(2.7,[[51.2,47.4],[49.6,55.6],[48.4,64]]); ln(2.7,[[53.2,47.4],[55,55.4],[56.4,64]]);
      poly(x,[[49.4,35.4],[54.8,35.2],[54.2,48.2],[49.8,48.4]]);
      x.beginPath(); x.arc(52.3,32,2.35,0,TAU); x.fill();
      ln(1.8,[[54.2,36.4],[57.6,30.4],[58.9,24.4]]); x.beginPath(); x.arc(59,23.8,1.05,0,TAU); x.fill();
      ln(1.7,[[50,36.6],[47.6,40.8],[50.4,34.8]]); ln(.8,[[50.4,34.8],[51.6,33.3]]);
      /* the crowd, and two arms up, one holding a phone */
      const R=rng(14); x.fillStyle=SIL;
      for(let i=0;i<15;i++){ const X=-3+i*7.6+(R()-.5)*3, Y=71.6+(R()-.5)*2.4, r=4.2+R()*.9; x.beginPath(); x.arc(X,Y,r,0,TAU); x.fill(); }
      x.fillRect(0,74,100,PH-74);
      ln(1.9,[[17.4,72],[19.2,63.6],[20.6,57.8]]); x.beginPath(); x.arc(20.8,57.2,1.15,0,TAU); x.fill();
      ln(1.9,[[78.6,72.4],[76.2,64.4],[75.4,60.2]]);
      x.save(); x.translate(75.2,58.2); x.rotate(-.12); x.fillStyle='#131218'; x.fillRect(-1.5,-2.4,3,4.8); x.fillStyle='#dbe7ff'; x.fillRect(-1.1,-2,2.2,4); x.restore();
    };
    const [,sx]=sheetR(W,H); sx.setTransform(S,0,0,S,0,0); scene(sx);
    const src=sx.getImageData(0,0,W,H).data, n=W*H;
    /* the haze is never perfectly smooth: a slow mottle through it */
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const i=(y*W+x)*4, k=1+(vn2(x*.035,y*.05,7)-.5)*.22+(vn2(x*.11,y*.13,8)-.5)*.08; src[i]*=k; src[i+1]*=k; src[i+2]*=k; }
    const SC=put(W,H,src);
    const crunch=(quality,fry)=>{
      const d=new Uint8ClampedArray(src), q=1-quality, bs=Math.max(2,Math.round(BLK*ps)), cbs=Math.max(bs,Math.round(CBLK*ps)), ring=.5*q;
      const Y=new Float32Array(n), Cb=new Float32Array(n), Cr=new Float32Array(n);
      for(let i=0,j=0;j<n;i+=4,j++){ const r=d[i], g=d[i+1], b=d[i+2]; Y[j]=.299*r+.587*g+.114*b; Cb[j]=-.169*r-.331*g+.5*b; Cr[j]=.5*r-.419*g-.081*b; }
      for(let ty=0;ty<H;ty+=cbs){ const y1=Math.min(H,ty+cbs); for(let tx=0;tx<W;tx+=cbs){ const x1=Math.min(W,tx+cbs); let sb=0,sr=0,c=0;
        for(let y=ty;y<y1;y++) for(let x=tx;x<x1;x++){ const j=y*W+x; sb+=Cb[j]; sr+=Cr[j]; c++; } const mb=sb/c, mr=sr/c;
        for(let y=ty;y<y1;y++) for(let x=tx;x<x1;x++){ const j=y*W+x; Cb[j]+=(mb-Cb[j])*q; Cr[j]+=(mr-Cr[j])*q; } } }
      const ACT=26, step=1+q*30;
      for(let ty=0;ty<H;ty+=bs){ const y1=Math.min(H,ty+bs); for(let tx=0;tx<W;tx+=bs){ const x1=Math.min(W,tx+bs); let sy=0,c=0;
        for(let y=ty;y<y1;y++) for(let x=tx;x<x1;x++){ sy+=Y[y*W+x]; c++; } const m=sy/c; let act=0;
        for(let y=ty;y<y1;y++) for(let x=tx;x<x1;x++) act+=Math.abs(Y[y*W+x]-m); act/=c;
        const flat=1-(act>=ACT?1:act/ACT), mq=m+(Math.round(m/step)*step-m)*flat, keep=1-q*flat+ring;
        for(let y=ty;y<y1;y++) for(let x=tx;x<x1;x++){ const j=y*W+x; Y[j]=mq+(Y[j]-m)*keep; } } }
      const cG=1+fry*1.6, yG=1+fry*.5;
      for(let i=0,j=0;j<n;i+=4,j++){ const cb=Cb[j]*cG, cr=Cr[j]*cG, y=fry>0?128+(Y[j]-128)*yG:Y[j]; d[i]=y+1.402*cr; d[i+1]=y-.344*cb-.714*cr; d[i+2]=y+1.772*cb; }
      return put(W,H,d); };
    const FR=[SC,crunch(.6,.25),crunch(.3,.25)], LBL=['OFF','QUALITY 0.60','QUALITY 0.30'];
    return (c,t)=>{
      const u=Math.floor(mod(t,P)*25)/25, k=u<.7?0:u<1.1?1:u<3.8?2:0;
      reset(c,px); c.fillStyle='#000'; c.fillRect(0,0,100,100);
      c.drawImage(FR[k],0,0,100,PH);
      c.font=MONO(5.2); c.textBaseline='middle'; c.textAlign='left'; c.fillStyle=k?TEXT:DIM; c.fillText(LBL[k],4,87.6);
      c.textAlign='right'; c.fillStyle=DIM; c.fillText('BLOCK '+BLK,96,87.6);
    };
  } },

/* BACKDROP CLONE. B, comp sheets: a stack of containers is CLIP 01; a Bone shape drops on it and settles. With Backdrop Clone the
   shape shows exactly what lies under it, so it all but vanishes; a blur added after it then frosts only that patch, and as the
   shape slides the picture inside it stays put, because it is a copy of what is beneath, never a picture of its own. */
{ id:'copybg', name:'Backdrop Clone', section:'Stylize', isNew:true, still:3.9,
  line:'The shape shows an exact copy of everything beneath it, so effects added after it change only that patch.',
  make(px){
    const P=5.2, N=240, S=N/100, CW=44, CH=34, Y0=31;
    const box2=(x,X,Y,w,h,col,dk,doors)=>{ x.fillStyle=col; x.fillRect(X,Y,w,h);
      x.fillStyle=dk; for(let v=X+1.2;v<X+w-.6;v+=1.7) x.fillRect(v,Y+1.2,.62,h-2.4);
      x.fillRect(X,Y,w,1); x.fillRect(X,Y+h-1,w,1);
      if(doors){ const dx=doors>0?X+w-12:X+.6; x.fillStyle=col; x.fillRect(dx,Y+1,11.4,h-2); x.fillStyle=dk; x.fillRect(dx+5.6,Y+1,.5,h-2); [1.6,3.8,7.6,9.8].forEach(o=>x.fillRect(dx+o,Y+1.6,.4,h-3.2)); [2.6,8.8].forEach(o=>x.fillRect(dx+o-.5,Y+h*.55,1.4,.7)); }
      x.fillStyle=COAL; x.fillRect(X+w-.4,Y,.4,h); };
    const yard=x=>{ x.fillStyle=COAL; x.fillRect(0,0,100,100);
      box2(x,-8,18,46,23,BONE,'#bdb6a7',1); box2(x,40,18,52,23,'#4b4641','#38342f',0);
      box2(x,6,42,52,23,VERM,'#b5361a',-1); box2(x,60,42,48,23,BONE,'#bdb6a7',0);
      box2(x,-4,66,50,23,'#4b4641','#38342f',1); box2(x,48,66,56,23,VERM,'#b5361a',1);
      x.fillStyle='#16130f'; x.fillRect(0,90,100,10); };
    const [,yx]=sheetR(N); yx.setTransform(S,0,0,S,0,0); yard(yx);
    const im=yx.getImageData(0,0,N,N).data, YD=put(N,N,im), n=N*N, pr=[new Float32Array(n),new Float32Array(n),new Float32Array(n)];
    for(let i=0;i<n;i++) for(let k=0;k<3;k++) pr[k][i]=im[i*4+k];
    for(const a of pr){ box(a,N,N,4); box(a,N,N,4); box(a,N,N,4); }
    const bl=new Uint8ClampedArray(n*4); for(let i=0;i<n;i++){ bl[i*4]=pr[0][i]; bl[i*4+1]=pr[1][i]; bl[i*4+2]=pr[2][i]; bl[i*4+3]=255; }
    const BLUR=put(N,N,bl);
    return (c,t)=>{
      const u=mod(t,P); reset(c,px);
      c.drawImage(YD,0,0,100,100);
      tab(c,3,3,'CLIP 01',4.4,BONE,INK);
      if(u<.35||u>=5.0) return;
      const y=u<1.1?lerp(-CH-8,Y0,settle(seg(u,.35,1.1))):u<4.5?Y0:lerp(Y0,-CH-10,E.in(seg(u,4.5,5.0)));
      const X=u<2.7?50:u<3.7?lerp(50,8,E.inOut(seg(u,2.7,3.7))):8;
      const mode=u<1.7?0:u<2.5?1:2;
      if(mode===0){ c.fillStyle=BONE; c.fillRect(X,y,CW,CH); }
      else{ c.save(); c.beginPath(); c.rect(X,y,CW,CH); c.clip(); c.drawImage(mode===1?YD:BLUR,0,0,100,100); c.restore();
        c.strokeStyle=BONE; c.lineWidth=.4; c.setLineDash([1.4,1]); c.strokeRect(X+.2,y+.2,CW-.4,CH-.4); c.setLineDash([]); }
      tab(c,X,y-6.6,mode===0?'SHAPE 02':mode===1?'+ BACKDROP CLONE':'+ CLONE + BLUR',4.4,BONE,INK);
    };
  } },

/* DITHER. D, two-ink print: a nautilus shell drawn here (a logarithmic spiral, three times wider per turn, with flame stripes on
   its older half, the dark hood at the aperture and the umbilicus), off the frame's centre and cut by its edge. (Art director, ad:
   it was a gibbous moon, which Gradient Map also shows.) Then the kernel at Output Mono, Levels 2, Ink and Paper set to Ink and Bone, Cell size 18 project px (4 px here; a 1080 frame drawn
   240 px wide). Method cuts from Ordered (the 4x4 Bayer table, every pixel against its cell's threshold) to Atkinson (cell means, an
   eighth of the error to six neighbours, serpentine). Both ported line for line and checked byte for byte against the app's render.
   The black sky stays solid ink under both: the one undisturbed area. */
{ id:'dither', name:'Dither', section:'Stylize', isNew:true, still:3.2,
  line:'Every tone is rebuilt from dots of just a few colours, here ink and paper, as a fixed pattern or a scatter.',
  make(px){
    const P=4.6, N=240, S=N/100, SC=4, G=N/SC;
    /* the shell: centre (CX,CY), outer edge r = RMAX * e^(B (phi - TE)) over the last turn, phi unwrapped clockwise up to the
       aperture at angle TE; the last whorl covers the earlier ones, as a nautilus's does */
    const CX=43, CY=55, RMAX=47, B=Math.log(3)/TAU, TE=-.32;
    const nl=Math.hypot(-.55,-.52,.65), LX=-.55/nl, LY=-.52/nl, LZ=.65/nl;
    const n=N*N, L=new Float32Array(n), im=new Uint8ClampedArray(n*4), SSN=3;
    const shade=(ux,uy)=>{   /* one sample: [value 0..255, warmth 0..1] */
      const dx=ux-CX, dy=uy-CY, rho=Math.hypot(dx,dy), th=Math.atan2(dy,dx);
      let back=((TE-th)%TAU+TAU)%TAU, phi=TE-back, ro=RMAX*Math.exp(B*(phi-TE)), lip=false;
      /* the aperture's lip leans forward past the end of the spiral, more at its outer edge, so the mouth is a curve and not a notch */
      const fwd=((th-TE)%TAU+TAU)%TAU;
      if(fwd<.75){ const rout=RMAX*Math.exp(B*fwd), rin=rout/3, qa=(rho-rin)/(rout-rin);
        if(qa>0&&qa<1&&fwd<=.75*Math.pow(qa,1.6)){ back=0; ro=rout; lip=true; } }
      if(rho>=ro) return [6,0];
      const q=rho/ro, er=rho>1e-6?[dx/rho,dy/rho]:[0,0];
      /* a lens of a solid, domed in the middle and turning away at its edge */
      const nz=Math.sqrt(Math.max(0,1-q*q*.92)), nx=er[0]*q*.96, ny=er[1]*q*.96, ndl=Math.max(0,nx*LX+ny*LY+nz*LZ);
      let alb=.9, warm=.35;
      /* flame stripes on the older part of the whorl, curving back as they run out from the middle, ragged at their tips */
      const age=back;   /* 0 at the aperture, up to 2 pi */
      if(age>1.5&&q>.16&&q<.82){ const ph=age*15+8*Math.pow(q,1.35)+1.1*vn2(age*3,q*4,7), tip=.46+.3*vn2(age*5,1,8)+.16*clamp((age-1.5)/2);
        const s=Math.sin(ph); if(s>.12&&q<tip){ alb=.34; warm=1; } }
      /* the umbilicus, and the dark hood where the aperture meets the turn before it */
      const ux2=dx+2.2, uy2=dy-1.2; if(Math.hypot(ux2,uy2)<3.4) { alb=.18; warm=.6; }
      /* the black hood: a small crescent where the mouth meets the turn before it */
      if(!lip&&back>TAU-.55&&q>.48){ alb=.07; warm=.2; }
      let v=255*clamp(alb*(.26+.8*Math.pow(ndl,.75)));
      const edge=clamp((ro-rho)*S*1.2); v=6+(v-6)*edge;
      return [v,warm]; };
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){ const j=y*N+x, i=j*4; let v=0, w=0;
      for(let sy=0;sy<SSN;sy++) for(let sx=0;sx<SSN;sx++){ const o=shade((x+(sx+.5)/SSN)/S,(y+(sy+.5)/SSN)/S); v+=o[0]; w+=o[1]; }
      v/=SSN*SSN; w/=SSN*SSN;
      im[i]=v; im[i+1]=v*(.95-.06*w); im[i+2]=Math.max(8,v*(.88-.16*w)); im[i+3]=255; }
    for(let j=0;j<n;j++) L[j]=im[j*4]*.299+im[j*4+1]*.587+im[j*4+2]*.114;
    const SR=put(N,N,im);
    const INKc=[0x16,0x13,0x0f], PAP=[0xe7,0xe2,0xd5], step=255;
    const paint=(o,i,v)=>{ const f=clamp(v/255); o[i]=INKc[0]+(PAP[0]-INKc[0])*f; o[i+1]=INKc[1]+(PAP[1]-INKc[1])*f; o[i+2]=INKc[2]+(PAP[2]-INKc[2])*f; o[i+3]=255; };
    const BY=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
    const ord=new Uint8ClampedArray(n*4);
    for(let y=0;y<N;y++){ const gy=Math.floor(y/SC); for(let x=0;x<N;x++){ const gx=Math.floor(x/SC), thr=(BY[gy&3][gx&3]/16-.5)*step, i=y*N+x; paint(ord,i*4,Math.round(Math.round((L[i]+thr)/step)*step)); } }
    /* Atkinson on the cell means, serpentine */
    const atk=new Uint8ClampedArray(n*4), top=Math.round(255/step); let E0=new Float64Array(G), E1=new Float64Array(G), E2=new Float64Array(G); const row=new Float64Array(G);
    for(let gy=0;gy<G;gy++){ row.fill(0);
      for(let y=gy*SC;y<gy*SC+SC;y++) for(let x=0;x<N;x++) row[Math.floor(x/SC)]+=L[y*N+x];
      for(let gx=0;gx<G;gx++) row[gx]/=SC*SC;
      const ltr=(gy&1)===0, dir=ltr?1:-1;
      for(let k=0;k<G;k++){ const gx=ltr?k:G-1-k, xa=gx+dir, xb=gx-dir, xc=gx+2*dir, v=row[gx]+E0[gx]; let qi=Math.round(v/step); qi=qi<0?0:qi>top?top:qi; const q=Math.round(qi*step), e=v-q, e8=e/8; row[gx]=q;
        if(xa>=0&&xa<G){ E0[xa]+=e8; E1[xa]+=e8; } if(xc>=0&&xc<G) E0[xc]+=e8; if(xb>=0&&xb<G) E1[xb]+=e8; E1[gx]+=e8; E2[gx]+=e8; }
      for(let y=gy*SC;y<gy*SC+SC;y++) for(let x=0;x<N;x++) paint(atk,(y*N+x)*4,row[Math.floor(x/SC)]);
      const r0=E0; E0=E1; E1=E2; E2=r0; E2.fill(0); }
    const ORD=put(N,N,ord), ATK=put(N,N,atk);
    return (c,t)=>{
      const u=mod(t,P), k=u<.7?0:u<2.55?1:u<4.4?2:0;
      reset(c,px); c.imageSmoothingEnabled=k===0;
      c.drawImage(k===0?SR:k===1?ORD:ATK,0,0,100,100); c.imageSmoothingEnabled=true;
      if(k) tab(c,3,91.6,k===1?'ORDERED':'ATKINSON',4.4,BONE,INK);
    };
  } }

);
})();
