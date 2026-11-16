/* FreeMotion effect pictures, round 5 slot 3: Starfield, redrawn for #1246 U3 (Streak). Built on what the effects-branch kernel
   computes (js/compositor.js starfieldMoving + sfEachStar): every number below is the kernel's own. */
(function(){
'use strict';
const {lerp,rng}=window.FXK;
const COAL='#0c0c0d', DIM='#8b96a8', MONO='"Courier Prime","Courier New",Courier,monospace';

window.FX_TILES=window.FX_TILES||[];
window.FX_TILES.push(

/* ---- Starfield: Coal with white pen. Fly-through is keyframed 0 > 2x > 0 with Streak 80: at rest the stars are the plain
   square dots; as the speed rises each one draws a line back toward the focus, 0.48 of a doubling long at 2x. ---- */
{ id:'starfield', name:'Starfield', section:'Generative', isNew:true, redrawn:true, still:1.9,
  line:'Streak 80% with Fly-through rising to 2×: each star stretches into a line back toward the focus, longer the faster it flies.',
  make(px){
    /* the comp: 720 px square, Star size 8, Density .45, Brightness spread .5, Focus 63 / 41, Streak 80 (the kernel's units).
       Density d keeps a cell of Star size px when its hash is under .03 d: (720/8)^2 x .03 x .45 = 109 stars. */
    const PROJ=720, SIZE=8, SZ=SIZE*100/PROJ, AMT=.45, VAR=.5, FX=63, FY=41, STREAK=.8;
    const N=Math.round((PROJ/SIZE)*(PROJ/SIZE)*AMT*.03), R=rng(1246), stars=[];
    /* each star: a spot, one of three depths a third of a pass apart, and the kernel's brightness 1 - spread x U x .9 */
    for(let i=0;i<N;i++) stars.push({bx:R()*100, by:R()*100, L:Math.floor(R()*3)%3, b:1-VAR*R()*.9});
    /* Fly-through keyframes (the app's easeInOut): 0 to T0, up to 2x at T1, held to T2, down to 0 at T3, rest to P */
    const P=3.8, T0=.4, T1=1, T2=2.4, T3=3, VMAX=2;
    const eio=u=>u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2;
    const spd=m=>m<T0?0:m<T1?VMAX*eio((m-T0)/(T1-T0)):m<T2?VMAX:m<T3?VMAX*(1-eio((m-T2)/(T3-T2))):0;
    /* the distance flown is the integral of the speed, a quarter pass a second at 1x: exactly one pass a loop, so it loops clean */
    const TB=760, FL=new Float64Array(TB+1);
    { let s=0; for(let i=0;i<TB;i++){ const a=i/TB*P, b=(i+1)/TB*P; s+=.25*(b-a)*(spd(a)+4*spd((a+b)/2)+spd(b))/6; FL[i+1]=s; } for(let i=0;i<=TB;i++) FL[i]/=FL[TB]; }
    const fly=m=>{ const x=m/P*TB, i=Math.min(TB-1,Math.floor(x)); return lerp(FL[i],FL[i+1],x-i); };
    /* a streak is K squares of side th = 0.7 side, one every 0.6 th, each weighted 0.85 w (q+1)/K. Swept along a line at angle a,
       an upright square covers a band th(|cos|+|sin|) wide whose depth across is a trapezoid (a box when level, a triangle at 45
       degrees), so the coverage is 0.85/0.6 x chord/th x w x u, clipped at 1. Sprites: 5 angle bands x 8 weight bands. */
    const SW=128, SH=16, AB=5, BANDS=8, spr=[];
    for(let j=0;j<AB;j++){ const ph=(j+.5)/AB*Math.PI/4, A=Math.cos(ph), B=Math.sin(ph), row=[];
      for(let k=0;k<BANDS;k++){ const C=document.createElement('canvas'); C.width=SW; C.height=SH; const x=C.getContext('2d'), w=(k+.5)/BANDS, im=x.createImageData(SW,SH);
        for(let y=0;y<SH;y++){ const d=Math.abs(((y+.5)/SH-.5)*(A+B)), ch=d<=(A-B)/2?1/A:Math.max(0,(A+B)/2-d)/(A*B);
          for(let i=0;i<SW;i++){ const u=(i+.5)/SW, o=(y*SW+i)*4; im.data[o]=im.data[o+1]=im.data[o+2]=255; im.data[o+3]=Math.round(255*Math.min(1,.85/.6*ch*w*u)); } }
        x.putImageData(im,0,0); row.push(C); }
      spr.push(row); }
    const sc=px/100;
    return (c,t)=>{
      /* Streak's length: Streak x min(1, speed/2) x 0.6 of a doubling, so the tail is where the star was that far back */
      const m=((t%P)+P)%P, v=spd(m), fl=fly(m), stk=STREAK*Math.min(1,v/2)*.6, stkE=Math.pow(2,-stk);
      c.setTransform(1,0,0,1,0,0); c.globalAlpha=1; c.globalCompositeOperation='source-over'; c.imageSmoothingEnabled=true; c.imageSmoothingQuality='high';
      c.fillStyle=COAL; c.fillRect(0,0,px,px);
      /* the kernel sums each star's coverage and clips at 1: 'lighter' on a dark ground is that sum */
      c.globalCompositeOperation='lighter'; c.fillStyle='#fff';
      for(const q of stars){
        /* Fly-through: this depth's pass grows the field 1x to 2x about the focus, fading in and out with sin of the pass */
        const ph=fl+q.L/3, f=ph-Math.floor(ph), w=Math.sin(Math.PI*f); if(w<=.004) continue;
        const s=Math.pow(2,f), side=SZ*s, hx=FX+(q.bx-FX)*s, hy=FY+(q.by-FY)*s;
        if(stk>.001){
          const tx=FX+(hx-FX)*stkE, ty=FY+(hy-FY)*stkE;
          if(tx<-2||tx>102||ty<-2||ty>102) continue;               /* the tail is nearer the focus than the head: out means all out */
          const dx=hx-tx, dy=hy-ty, len=Math.hypot(dx,dy), th=side*.7;
          if(len>.05){ const ux=dx/len, uy=dy/len, A=Math.max(Math.abs(ux),Math.abs(uy)), B=Math.min(Math.abs(ux),Math.abs(uy)), bw=th*(A+B);
            const j=Math.min(AB-1,Math.floor(Math.atan2(B,A)/(Math.PI/4)*AB));
            c.globalAlpha=q.b; c.setTransform(dx*sc/SW,dy*sc/SW,-uy*bw*sc/SH,ux*bw*sc/SH,(tx+.5*bw*uy)*sc,(ty-.5*bw*ux)*sc);
            c.drawImage(spr[j][Math.min(BANDS-1,Math.floor(w*BANDS))],0,0); }
        } else if(hx+side<0||hx-side>100||hy+side<0||hy-side>100) continue;
        /* the star itself: an upright square, Star size x the pass's scale */
        c.setTransform(sc,0,0,sc,0,0); c.globalAlpha=w*q.b; c.fillRect(hx-side/2,hy-side/2,side,side);
      }
      /* furniture: the Focus mark (a dim reticle, open in the middle) and the Fly-through value on a flat tab */
      c.setTransform(sc,0,0,sc,0,0); c.globalCompositeOperation='source-over'; c.globalAlpha=1;
      c.strokeStyle=DIM; c.lineWidth=.5; c.beginPath();
      c.moveTo(FX-3.6,FY); c.lineTo(FX-1.3,FY); c.moveTo(FX+1.3,FY); c.lineTo(FX+3.6,FY); c.moveTo(FX,FY-3.6); c.lineTo(FX,FY-1.3); c.moveTo(FX,FY+1.3); c.lineTo(FX,FY+3.6); c.stroke();
      const lab='FLY '+v.toFixed(1)+'×'; c.font='700 4.4px '+MONO; const lw=c.measureText(lab).width;
      c.fillStyle=COAL; c.fillRect(2.4,90.2,lw+3.6,6.6); c.fillStyle='#fff'; c.textBaseline='middle'; c.fillText(lab,4.2,93.6); c.textBaseline='alphabetic';
    };
  } }
);
})();
